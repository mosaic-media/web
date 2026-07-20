// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Routes and the browser history, transport-agnostic (nothing here touches the
 * socket). A Route is {screen, params} — exactly a navigate intent — and it maps
 * to a URL so screens are shareable and deep-linkable: /search?text=akira,
 * /detail?nodeId=…, /detail?ref=<json>. The Shell pushes a Route on a real
 * navigate, replaces it (no history entry) for search-as-you-type, and turns
 * popstate back into a navigate. On (re)connect it re-declares the current
 * Route so the Platform re-renders the exact screen that was showing (ADR 0032).
 */

export interface Route {
  screen: string;
  params?: Record<string, unknown>;
}

/** routeToUrl renders a Route as a path + query string. Object/array params are
 *  JSON-encoded (the detail screen's `ref` is an object); strings pass through. */
export function routeToUrl(route: Route): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(route.params ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  const qs = q.toString();
  return `/${route.screen}${qs ? `?${qs}` : ""}`;
}

/** routeFromLocation parses the current URL back into a Route, the inverse of
 *  routeToUrl. An empty path is the default `search` screen. */
export function routeFromLocation(): Route {
  const screen = decodeURIComponent(location.pathname.replace(/^\/+/, "")) || "search";
  const params: Record<string, unknown> = {};
  new URLSearchParams(location.search).forEach((val, key) => {
    params[key] = parseParam(val);
  });
  return Object.keys(params).length ? { screen, params } : { screen };
}

/** parseParam decodes a query value: a JSON object/array (the `ref` param) is
 *  parsed back to a value; anything else stays a string. */
function parseParam(v: string): unknown {
  if (v.startsWith("{") || v.startsWith("[")) {
    try {
      return JSON.parse(v);
    } catch {
      /* not JSON after all — fall through to the raw string */
    }
  }
  return v;
}

/** sameRoute reports whether two routes address the same screen and params, so
 *  the Shell can avoid pushing a duplicate history entry. */
export function sameRoute(a: Route, b: Route): boolean {
  return a.screen === b.screen && JSON.stringify(a.params ?? {}) === JSON.stringify(b.params ?? {});
}
