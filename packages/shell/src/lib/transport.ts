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
import { traceInterceptor } from "./trace";

/** Same-origin in dev (Vite proxies both service paths to the Platform);
 *  override with VITE_PLATFORM_URL to point at a Platform directly. */
export const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_PLATFORM_URL ?? window.location.origin,
  // Every call carries a freshly minted W3C traceparent (ADR 0054). The
  // Platform continues that trace rather than starting its own, so a click
  // here and the database write it causes share one id — which is what makes a
  // failure that crosses repositories a lookup instead of an investigation.
  interceptors: [traceInterceptor],
});
