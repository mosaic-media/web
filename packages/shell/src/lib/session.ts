// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The session credential (ADR 0102): a short-lived access token presented on
 * every call, and a long-lived refresh token exchanged for a new pair.
 *
 * This client stores both in `localStorage`, which is stated plainly rather
 * than smoothed over: **on the web that is reachable by any script that gets
 * into the page.** What limits the damage is the short access lifetime,
 * rotation with reuse detection, and per-device revocation — not a belief that
 * a token in a browser is safe. The Shell ships no third-party script and
 * authors no inline markup, which keeps the exposure small, and that property
 * is security-relevant here rather than only tidy.
 *
 * It is not a cookie, and that is a decision rather than an oversight: three of
 * the four clients this transport was chosen against have no use for one, and
 * the credential must not depend on a same-origin front door that does not
 * exist yet.
 *
 * The device id is persisted too. A session belongs to a device, so the
 * Platform can end this browser without ending a TV — and a refresh token is
 * bound to the device it was issued to, so a client that forgot its own device
 * id would be indistinguishable from a stolen credential replayed elsewhere.
 *
 * **Nothing here signs in.** It used to: the Shell authenticated on boot with a
 * username and password compiled into the bundle, which is how a build artefact
 * came to hold the administrator's credentials and how every browser that
 * opened it became the same person. Signing in is now a form on the doorway,
 * and the doorway's actions travel on bootstrap.ts's lane — so this module is
 * storage, rotation and nothing else.
 */

import { createClient, ConnectError, Code } from "@connectrpc/connect";
import { AuthService } from "@mosaic-media/sdui/auth";
import { transport } from "./transport";

const STORAGE_KEY = "mosaic.session";
const DEVICE_KEY = "mosaic.device";

/** The stored credential. */
export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** When the access token stops working, as epoch milliseconds. Advisory: the
   *  server decides, and this only lets the client refresh *before* a call
   *  fails rather than after. A clock that is wrong costs one round trip. */
  accessExpiresAt: number;
}

/** deviceID is this browser's stable identity, minted once and kept.
 *
 * It is random rather than derived from anything about the browser: a
 * fingerprint would be the same value for two people on one machine, which is
 * exactly the case per-device revocation exists to separate. Clearing storage
 * makes this a new device, which is correct — the credential went with it. */
export function deviceID(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function loadSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return parsed;
  } catch {
    // Unreadable storage is a client that has nothing, not an error worth
    // surfacing: the way out is signing in again, which is what returning null
    // produces.
    return null;
  }
}

export function saveSession(s: StoredSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Exchanges the stored refresh token for a new pair.
 *
 * **The old token is spent by this call**, so the new pair replaces it the
 * instant it arrives. A client that kept the old value and presented it again
 * would be indistinguishable from a thief replaying it, and the Platform would
 * revoke the whole chain — which is the intended behaviour and the reason this
 * function is the only place a refresh happens.
 *
 * A failure clears storage. There is nothing to retry: a refused refresh means
 * the chain is gone, and holding a dead credential only delays the sign-in that
 * has to happen anyway.
 *
 * **Concurrent callers share one exchange**, and that is load-bearing rather
 * than an optimisation. Because the old token is spent, two refreshes racing
 * with the same stored pair mean the second presents a token the first has
 * already burned — the Platform correctly reads that as a replay and refuses,
 * and this client correctly reads a refused refresh as "sign in again". So a
 * *successful* rotation signed the user out.
 *
 * It is not a rare race. Restarting the Platform under a live client drops the
 * Subscribe stream and fails whatever intents were in flight, and both paths
 * refresh: the reconnect renews before it subscribes, the intent retries on
 * Unauthenticated. Found by restarting the Platform to test something else and
 * arriving at the doorway. */
let refreshInFlight: Promise<StoredSession> | null = null;

export function refreshSession(stored: StoredSession): Promise<StoredSession> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = exchangeRefreshToken(stored).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function exchangeRefreshToken(stored: StoredSession): Promise<StoredSession> {
  const client = createClient(AuthService, transport);
  try {
    const { tokens } = await client.refresh({
      refreshToken: stored.refreshToken,
      deviceId: deviceID(),
    });
    if (!tokens?.accessToken || !tokens.refreshToken) {
      throw new Error("The Platform refreshed a session with no credential pair.");
    }
    const next = storedFrom(tokens);
    saveSession(next);
    return next;
  } catch (e) {
    clearSession();
    throw e;
  }
}

/** The credential to present, refreshing first if it is about to expire.
 *
 * Refreshing *before* the call rather than only after a failure is what keeps
 * the pair invisible in normal use: a long-lived Subscribe stream would
 * otherwise be opened with a credential that expires mid-flight. Sixty seconds
 * of slack covers an ordinary clock skew without making the short lifetime
 * meaningless. */
export async function currentSession(stored: StoredSession): Promise<StoredSession> {
  if (Date.now() < stored.accessExpiresAt - 60_000) return stored;
  return refreshSession(stored);
}

/** Whether a failure is the Platform saying this credential is no longer good —
 *  the one error a client answers by refreshing rather than by giving up. */
export function isUnauthenticated(e: unknown): boolean {
  return e instanceof ConnectError && e.code === Code.Unauthenticated;
}

/** storedFrom turns an issued pair into what this client keeps.
 *
 * Exported because two paths mint a session now — the doorway's actions and a
 * refresh — and a second copy of this conversion is a second place the expiry
 * can be got wrong. */
export function storedFrom(tokens: {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt?: { seconds: bigint };
}): StoredSession {
  const seconds = tokens.accessExpiresAt?.seconds ?? 0n;
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    // A missing expiry means "refresh on the next call" rather than "never":
    // treating it as far in the future would leave the client believing in a
    // credential long after the server stopped.
    accessExpiresAt: seconds > 0n ? Number(seconds) * 1000 : 0,
  };
}
