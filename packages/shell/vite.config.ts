// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// The Shell is a static SPA. In dev it proxies /graphql to the Platform
// (default :8081) so the browser can talk to it without CORS. Override the
// target with MOSAIC_PLATFORM_URL.
const platform = process.env.MOSAIC_PLATFORM_URL ?? "http://localhost:8081";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev sign-in still uses GraphQL to mint a session (no Connect SignIn RPC).
      "/graphql": { target: platform, changeOrigin: true },
      // Artwork the Platform proxies (ADR 0030) — same-origin so the artlight
      // canvas is readable without any CORS.
      "/artwork": { target: platform, changeOrigin: true },
      // The live session: the two-lane Connect SessionService (ADR 0041). Unary
      // intents and the long-lived Subscribe stream both POST here; http-proxy
      // streams the server-stream response back.
      "/mosaic.session.v1.SessionService": { target: platform, changeOrigin: true },
    },
  },
});
