#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors
/*
 * Copy the contract's generated token sheet into this package as the bootstrap
 * skin (src/styles/tokens.gen.css).
 *
 * No design value is authored in this client. Tokens live in mosaic-sdui
 * (tokens/tokens.json), the Platform serves them over the session, and a running
 * client applies what it is served. This copy exists only for the moments before
 * that arrives — first paint, and the Standby screen when the Platform cannot be
 * reached — so it is a cache of the contract, never a source.
 *
 * It reads the installed @mosaic-media/sdui, falling back to a sibling checkout
 * mounted at /src/contracts (the dev stack) so local contract work is visible
 * without publishing first. Run it after bumping the dependency.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, "../src/styles/tokens.gen.css");

const candidates = [
  join(here, "../node_modules/@mosaic-media/sdui/tokens/tokens.css"),
  join(here, "../../../node_modules/@mosaic-media/sdui/tokens/tokens.css"),
  "/src/contracts/tokens/tokens.css",
];

const src = candidates.find((p) => existsSync(p));
if (!src) {
  console.error(
    "sync-tokens: no token sheet found. Install @mosaic-media/sdui >= 0.16.0, " +
      "or mount the contracts checkout at /src/contracts.\nLooked in:\n  " +
      candidates.join("\n  "),
  );
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`sync-tokens: ${src} -> src/styles/tokens.gen.css`);
