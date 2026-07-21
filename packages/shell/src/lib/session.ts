// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Dev sign-in. So the skeleton can be driven without a login form, the Shell
 * signs in on boot with dev credentials and hands the session to the runtime's
 * GraphQL client (setAuthToken) — which then carries it as an Authorization:
 * Bearer header on every action the runtime dispatches. The same session id is
 * passed as callerSessionId on the screen queries the Shell issues itself.
 *
 * The credentials default to the Platform's bootstrap admin (start it with
 * MOSAIC_BOOTSTRAP_ADMIN_USERNAME / _PASSWORD). Override in the Shell with
 * VITE_DEV_USERNAME / VITE_DEV_PASSWORD. This is a development convenience only.
 */

import { gql, setAuthToken } from "@mosaic-media/sdui-react";

const DEV_USERNAME = import.meta.env.VITE_DEV_USERNAME ?? "admin";
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD ?? "admin";

interface SignInResult {
  signIn: { session: { id: string } };
}

/** Signs in with the dev credentials and returns the session id, arming the
 * runtime client with it as a bearer token. Throws a PlatformError on failure. */
export async function devSignIn(): Promise<string> {
  const data = await gql<SignInResult>(
    `mutation DevSignIn($u: String!, $p: String!, $d: String!) {
       signIn(username: $u, password: $p, deviceId: $d) { session { id } }
     }`,
    { u: DEV_USERNAME, p: DEV_PASSWORD, d: "shell-dev" },
  );
  const session = data.signIn.session.id;
  setAuthToken(session);
  return session;
}
