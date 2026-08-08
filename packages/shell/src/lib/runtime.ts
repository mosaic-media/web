// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Configuration the serving process injects into the document.
 *
 * The Shell used to learn its Platform endpoint from `import.meta.env`, which
 * Vite resolves *at build time* — so one built artefact could serve exactly one
 * install, and pointing it somewhere else meant rebuilding it. `mosaic-shell`
 * writes this object into index.html when it serves the page, so the endpoint
 * is a property of the running deployment rather than of the bundle.
 *
 * Nothing secret may go in here. It is readable by anyone who loads the page.
 */

/** What `mosaic-shell` publishes. Mirrors `runtimeConfig` in
 *  mosaic-shell/shellserver/server.go — the two are one contract, and the
 *  property name below is the third half of it. */
export interface ShellRuntime {
  /** The Platform's origin, or "" for same-origin — the deployed shape
   *  behind the Supervisor's single front door. */
  platformUrl: string;
  /** Names one start of the serving process (ADR 0060). */
  bootId: string;
  /** The serving binary's version. */
  version: string;
}

declare global {
  interface Window {
    __MOSAIC_SHELL__?: Partial<ShellRuntime>;
  }
}

/** The injected object, or an empty one under `vite dev`, where no Go process
 *  is serving the page. */
export const shellRuntime: Partial<ShellRuntime> =
  (typeof window !== "undefined" ? window.__MOSAIC_SHELL__ : undefined) ?? {};

/**
 * Where to open the Connect transport.
 *
 * Three sources, in the order that lets each layer be right about itself:
 * the serving process when there is one; then `VITE_PLATFORM_URL`, which is how
 * `vite dev` points at a Platform on another port; then the page's own origin,
 * which is correct both behind the front door and under Vite's proxy.
 *
 * An injected empty string means same-origin and must not be mistaken for
 * "unset" — hence the explicit `undefined` check rather than `||`.
 */
export function platformBaseURL(): string {
  const injected = shellRuntime.platformUrl;
  if (injected !== undefined && injected !== "") {
    return injected;
  }
  if (injected === "") {
    return window.location.origin;
  }
  return import.meta.env.VITE_PLATFORM_URL ?? window.location.origin;
}
