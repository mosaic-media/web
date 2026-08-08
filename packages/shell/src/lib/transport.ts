// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The one connection to the Platform.
 *
 * Since ADR 0061 the Platform serves exactly two Connect services and nothing
 * else — AuthService to mint a session, SessionService to spend it (ADR 0041) —
 * so they share a transport rather than each configuring their own. That is not
 * only tidier: the traceparent interceptor below has to be on every call for a
 * trace to be continuous, and a second transport is how one silently isn't.
 */

import { createConnectTransport } from "@connectrpc/connect-web";
import { platformBaseURL } from "./runtime";
import { traceInterceptor } from "./trace";

/** Resolved at *runtime*, not at build time: the serving `mosaic-shell`
 *  process injects the endpoint into the document, so one built artefact
 *  serves every install. See ./runtime.ts for the order of precedence and why
 *  an injected empty string is same-origin rather than unset. */
export const transport = createConnectTransport({
  baseUrl: platformBaseURL(),
  // Every call carries a freshly minted W3C traceparent (ADR 0054). The
  // Platform continues that trace rather than starting its own, so a click
  // here and the database write it causes share one id — which is what makes a
  // failure that crosses repositories a lookup instead of an investigation.
  interceptors: [traceInterceptor],
});
