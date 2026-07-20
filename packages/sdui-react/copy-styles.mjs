// Copy the CSS (which tsc ignores) into dist so the package can ship its skin.
import { mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const src = "src/styles";
const out = "dist/styles";
mkdirSync(out, { recursive: true });
for (const f of readdirSync(src)) {
  if (f.endsWith(".css")) copyFileSync(join(src, f), join(out, f));
}
console.log("copied styles → dist/styles");
