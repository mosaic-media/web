// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Dev sign-in. So the skeleton can be driven without a login form, the Shell
 * signs in on boot with dev credentials and hands the session id to the live
 * client, which carries it on every SessionService call.
 *
 * This runs over the Platform's AuthService (ADR 0061) — the same Connect
 * transport as the live session, and the one call made before a session exists.
 * It used to be a GraphQL mutation, and it was the last thing keeping a second
 * client transport in this app alive.
 *
 * The credentials default to the Platform's bootstrap admin (start it with
 * MOSAIC_BOOTSTRAP_ADMIN_USERNAME / _PASSWORD). Override in the Shell with
 * VITE_DEV_USERNAME / VITE_DEV_PASSWORD. This is a development convenience only.
 */

import { createClient, ConnectError, Code } from "@connectrpc/connect";
import { AuthService } from "@mosaic-media/sdui/auth";
import { transport } from "./transport";

const DEV_USERNAME = import.meta.env.VITE_DEV_USERNAME ?? "admin";
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? "admin";

/** The device this client identifies as. A session belongs to a device, so the
 *  Platform can revoke this one without ending a session on a TV. */
const DEVICE_ID = "shell-dev";

/** Signs in with the dev credentials and returns the session id.
 *
 * Failures are rethrown with a message worth reading. The Platform now answers
 * with a real status code rather than a 200 carrying an error object, so the
 * two cases a developer actually hits — wrong credentials, and no Platform
 * running — are distinguishable here instead of both surfacing as "failed". */
export async function devSignIn(): Promise<string> {
  const client = createClient(AuthService, transport);
  try {
    const { session } = await client.signIn({
      username: DEV_USERNAME,
      password: DEV_PASSWORD,
      deviceId: DEVICE_ID,
    });
    if (!session?.id) {
      throw new Error("The Platform issued a session with no id.");
    }
    return session.id;
  } catch (e) {
    throw new Error(signInMessage(e));
  }
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
