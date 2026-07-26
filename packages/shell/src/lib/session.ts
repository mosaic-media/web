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
 */

import { createClient, ConnectError, Code } from "@connectrpc/connect";
import { AuthService } from "@mosaic-media/sdui/auth";
import { transport } from "./transport";

const DEV_USERNAME = import.meta.env.VITE_DEV_USERNAME ?? "admin";
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? "admin";

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

/** Signs in and stores the pair.
 *
 * The credentials still come from the build (VITE_DEV_USERNAME / _PASSWORD, or
 * the Platform's bootstrap admin) because the sign-in *screen* is the next
 * milestone. What changed is what happens afterwards: the pair is persisted, so
 * this runs once rather than on every page load. */
export async function signIn(): Promise<StoredSession> {
  const client = createClient(AuthService, transport);
  try {
    const { tokens } = await client.signIn({
      username: DEV_USERNAME,
      password: DEV_PASSWORD,
      deviceId: deviceID(),
    });
    if (!tokens?.accessToken || !tokens.refreshToken) {
      throw new Error("The Platform issued a session with no credential pair.");
    }
    const stored = pairToStored(tokens);
    saveSession(stored);
    return stored;
  } catch (e) {
    throw new Error(signInMessage(e));
  }
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
 * has to happen anyway. */
export async function refreshSession(stored: StoredSession): Promise<StoredSession> {
  const client = createClient(AuthService, transport);
  try {
    const { tokens } = await client.refresh({
      refreshToken: stored.refreshToken,
      deviceId: deviceID(),
    });
    if (!tokens?.accessToken || !tokens.refreshToken) {
      throw new Error("The Platform refreshed a session with no credential pair.");
    }
    const next = pairToStored(tokens);
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

function pairToStored(tokens: {
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

function signInMessage(e: unknown): string {
  if (!(e instanceof ConnectError)) {
    return e instanceof Error ? e.message : "Sign-in failed.";
  }
  switch (e.code) {
    case Code.Unauthenticated:
      return `Sign-in was refused for "${DEV_USERNAME}". Check VITE_DEV_USERNAME / VITE_DEV_PASSWORD against the Platform's bootstrap admin.`;
    case Code.Unavailable:
      return "Could not reach the Platform. Is it running on the address the dev proxy points at?";
    default:
      return `Sign-in failed (${Code[e.code]}): ${e.rawMessage}`;
  }
}
