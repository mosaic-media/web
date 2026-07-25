#!/usr/bin/env node
/**
 * Measure this client against the contract's conformance fixture.
 *
 * The published contract declares the vocabulary as data
 * (`@mosaic-media/sdui/conformance`, ADR 0083); this client declares what it
 * implements (`nativePrimitives`, `NATIVE_ACTION_KINDS`). Until both existed the
 * question "is this client behind the contract, and by what?" had no answer
 * outside somebody reading two files side by side — which is how the primitive
 * tier drifted for the whole life of the project behind a green build.
 *
 * Three rules, and the third is the one that earns this script's existence:
 *
 *   1. **This client may not claim a primitive the contract does not have.** A
 *      type registered here and absent there is a component smuggled into the
 *      native tier, or a typo — either way the server will never send it.
 *   2. **This client may not claim an action kind the contract does not have.**
 *      Same reasoning; the Platform would strip every one of them.
 *   3. **The gap is stated, not discovered.** EXPECTED_GAP below names exactly
 *      what the contract declares and this client does not implement. A gap that
 *      grows fails here; a gap that closes fails here too, because the list is
 *      then a lie about a client that has caught up. Either way the number is
 *      argued about in a diff rather than found in production.
 *
 * Run in the container after the workspace build:
 *   node scripts/check-vocabulary.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

/**
 * What the contract declares and this client does not implement.
 *
 * Everything here is deliberate and belongs to a later slice of the SDUI thread:
 * **The gap is empty.** Every entry left the right way: `setValue` when State
 * scopes landed, `submit` when forms did, `query` when lazy lists needed it, and
 * `Form` by leaving the primitive tier entirely once it turned out to be a
 * composition. The list stays because the next contract addition will land here
 * first, and stating the gap is what keeps being behind a position rather than
 * an accident. They are in the contract now because a vocabulary is
 * versioned and negotiated as a whole — see ADR 0083 — and they are listed here
 * so that being behind the contract is a stated position rather than an
 * accident. Update this list in the change that closes a gap, not after.
 */
const EXPECTED_GAP = {
  primitives: [],
  actions: [],
};

const fixture = JSON.parse(readFileSync(require.resolve("@mosaic-media/sdui/conformance"), "utf8"));

// The built artefact, not the source — what a consumer actually gets. It is the
// dependency-free `sdui/native` module rather than the package entry point on
// purpose: the entry point pulls in React and the whole runtime, which a plain
// Node script cannot load, and depending on a bundler to run a check would be a
// check that only runs where the bundler does.
const native = await import(
  pathToFileURL(new URL("../packages/sdui-react/dist/sdui/native.js", import.meta.url).pathname).href
);
const nativePrimitives = [...native.NATIVE_PRIMITIVE_TYPES].sort();
const NATIVE_ACTION_KINDS = native.NATIVE_ACTION_KINDS;

const contractPrimitives = fixture.primitives.map((p) => p.type);
const contractActions = fixture.actions;

const problems = [];

// The binding marker. A client resolving a different one than the server emits
// would leave every bound prop as an unread literal object — drawing nothing,
// reporting nothing, and looking exactly like a server that sent no value. It is
// one string, so it is checked rather than trusted.
if (native.BINDING_MARKER !== fixture.bindingMarker) {
  problems.push(
    `this client reads bindings marked "${native.BINDING_MARKER}" but the contract emits ` +
      `"${fixture.bindingMarker}" — every bound prop would silently draw nothing.`,
  );
}

const extra = (mine, theirs) => mine.filter((x) => !theirs.includes(x)).sort();
const gap = (theirs, mine) => theirs.filter((x) => !mine.includes(x)).sort();
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// The two closed sets must match exactly, in both directions. A validator this
// client does not implement is a rule the server can state and nothing enforces —
// the fail-open case the closed set exists to prevent — and one it implements
// that the contract does not declare is a rule no server can ask for.
for (const [what, mine, theirs] of [
  ["validator", [...native.VALIDATORS], [...fixture.validators].sort()],
  ["predicate", [...native.PREDICATES], [...fixture.predicates].sort()],
  ["role", [...native.ROLES].sort(), [...fixture.roles].sort()],
  ["focus direction", [...native.FOCUS_DIRECTIONS].sort(), [...fixture.focusDirections].sort()],
]) {
  const missing = theirs.filter((x) => !mine.includes(x));
  const extra = mine.filter((x) => !theirs.includes(x));
  if (missing.length) problems.push(`this client implements no ${what} "${missing.join('", "')}" that the contract declares — the server could state it and this client would silently drop it.`);
  if (extra.length) problems.push(`this client implements the ${what} "${extra.join('", "')}", which the contract does not declare.`);
}

for (const [what, mine, theirs] of [
  ["primitive", nativePrimitives, contractPrimitives],
  ["action kind", [...NATIVE_ACTION_KINDS], contractActions],
]) {
  for (const x of extra(mine, theirs)) {
    problems.push(
      `this client declares the ${what} "${x}", which the contract's vocabulary does not have — ` +
        `the Platform will never send it. Spec it in \`contracts\` (ui.spec.json) or stop declaring it.`,
    );
  }
}

const primitiveGap = gap(contractPrimitives, nativePrimitives);
const actionGap = gap(contractActions, [...NATIVE_ACTION_KINDS]);

if (!same(primitiveGap, EXPECTED_GAP.primitives.slice().sort())) {
  problems.push(
    `the primitives this client does not implement are [${primitiveGap.join(", ")}], ` +
      `but EXPECTED_GAP says [${EXPECTED_GAP.primitives.join(", ")}]. ` +
      `If a primitive was implemented, remove it from the list; if the contract grew, decide whether ` +
      `to implement it and say so here either way.`,
  );
}
if (!same(actionGap, EXPECTED_GAP.actions.slice().sort())) {
  problems.push(
    `the action kinds this client does not interpret are [${actionGap.join(", ")}], ` +
      `but EXPECTED_GAP says [${EXPECTED_GAP.actions.join(", ")}].`,
  );
}

if (problems.length > 0) {
  console.error("check-vocabulary: this client and the contract disagree\n");
  for (const p of problems) console.error(`  - ${p}\n`);
  process.exit(1);
}

console.error(
  `check-vocabulary: ${nativePrimitives.length}/${contractPrimitives.length} primitives, ` +
    `${NATIVE_ACTION_KINDS.length}/${contractActions.length} action kinds, ` +
    `binding marker ${native.BINDING_MARKER}, ` +
    `${native.VALIDATORS.length} validators, ${native.PREDICATES.length} predicates, ${native.ROLES.length} roles, ${native.FOCUS_DIRECTIONS.length} focus directions, ` +
    `against vocabulary ${fixture.version}. Declared gap: ` +
    `${EXPECTED_GAP.primitives.join(", ") || "none"} / ${EXPECTED_GAP.actions.join(", ") || "none"}.`,
);
