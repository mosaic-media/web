// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Sign-in, over the Platform's AuthService (ADR 0061) — the one call made
 * before a session exists, and the one screen drawn before there is a session
 * to draw it on (ADR 0097).
 *
 * The Shell used to sign in on boot with credentials read out of Vite
 * environment variables, so there was no sign-in UI at all and a build with
 * them unset reported that the server could not be reached, which was not what
 * had happened. Both are gone: the Platform serves the sign-in tree, this
 * renders it, and a refused password says so.
 */

import { createClient, ConnectError, Code } from "@connectrpc/connect";
import { AuthService } from "@mosaic-media/sdui/auth";
import type { UINode } from "@mosaic-media/sdui-react";
import { transport } from "./transport";

/** The device this client identifies as. A session belongs to a device, so the
 *  Platform can revoke this one without ending a session on a TV. */
const DEVICE_ID = "shell-web";

/** The single mutation a pre-session tree may carry (ADR 0097). The client
 *  interprets it itself, because there is no session to dispatch it on. */
export const SIGN_IN_ACTION = "signIn";

const client = () => createClient(AuthService, transport);

/** Fetches the sign-in tree, optionally carrying the reason the last attempt
 *  was refused so the same surface that asked states the refusal. */
export async function signInScreen(error?: string): Promise<UINode> {
  const { screen } = await client().signInScreen({ error: error ?? "" });
  if (!screen) throw new Error("The Platform served no sign-in screen.");
  return screen as UINode;
}

/** Signs in and returns the session id. Throws with a message worth reading. */
export async function signIn(username: string, password: string): Promise<string> {
  try {
    const { session } = await client().signIn({ username, password, deviceId: DEVICE_ID });
    if (!session?.id) throw new Error("The Platform issued a session with no id.");
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
      // The Platform collapses "no such user" and "wrong password" into one
      // answer on purpose, so this endpoint cannot be used to find out which
      // usernames exist. Restating it in the client must not un-collapse it.
      return "That username and password did not match.";
    case Code.Unavailable:
      return "Could not reach the Platform.";
    default:
      return `Sign-in failed (${Code[e.code]}): ${e.rawMessage}`;
  }
}
