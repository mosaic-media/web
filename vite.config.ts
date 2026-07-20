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
      "/graphql": { target: platform, changeOrigin: true },
    },
  },
});
