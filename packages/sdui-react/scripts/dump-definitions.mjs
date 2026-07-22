// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Serialise the standard component-definition library to JSON — the artefact the
 * Platform embeds and pushes to clients over the session (ADR 0041), so the
 * design system is server-owned data rather than client-bundled code. Run after
 * `npm run build`; pass the output path:
 *   node scripts/dump-definitions.mjs ../../path/to/definitions.json
 *
 * The definitions are pure data (trees of primitives with $bind/$if markers), so
 * a straight JSON.stringify round-trips them exactly.
 */
import { writeFileSync } from "node:fs";
import { PLATFORM_DEFINITIONS } from "../dist/components/definitions.js";
import { LAYOUT_DEFINITIONS } from "../dist/components/definitions.layout.js";

const out = process.argv[2];
if (!out) {
  console.error("usage: node dump-definitions.mjs <output.json>");
  process.exit(1);
}
// Layout containers first (Screen/AppShell/Section/…), then platform components.
const all = [...LAYOUT_DEFINITIONS, ...PLATFORM_DEFINITIONS];
writeFileSync(out, JSON.stringify(all, null, 2) + "\n");
console.log(`wrote ${all.length} definitions → ${out}`);
