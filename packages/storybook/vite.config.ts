import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployed to GitHub Pages at mosaic-media.github.io/web, so assets resolve
// under that subpath. **The base is the repository name, not this package's**
// — Pages serves a project site at /<repo>/, and this package moved into the
// `web` workspace under ADR 0042 while the base stayed at "/mosaic-storybook/",
// which pointed every asset URL at a subpath the site is not served from.
// Override with a custom domain by setting base "/".
export default defineConfig({
  // The libass subtitle renderer's worker is an ES module that code-splits
  // (ADR 0115), and Vite's default worker format is IIFE, which Rollup refuses
  // to emit for a split build — "UMD and IIFE output formats are not supported
  // for code-splitting builds". Every browser this client targets supports
  // module workers.
  worker: { format: "es" },
  plugins: [react()],
  base: process.env.STORYBOOK_BASE ?? "/web/",
});
