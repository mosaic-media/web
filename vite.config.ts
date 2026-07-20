import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployed to GitHub Pages at mosaic-media.github.io/mosaic-storybook, so assets
// resolve under that subpath. Override with a custom domain by setting base "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.STORYBOOK_BASE ?? "/mosaic-storybook/",
});
