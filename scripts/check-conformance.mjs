#!/usr/bin/env node
/**
 * Run the contract's conformance corpus against this client (ADR 0094).
 *
 * The corpus is the same set of golden cases the Go side runs. That is the whole
 * point of it: two implementations, one set of expected answers, and any
 * disagreement surfaces as a named failing case rather than as a screen that
 * behaves differently on one platform and identically in every test.
 *
 * This client runs all five files, including the two the contracts repository
 * publishes and cannot execute: definition expansion, having no expander of its
 * own, and the submit merge, having no dispatcher. Those rules are checked here
 * or nowhere — and the submit corpus exists because "or nowhere" was the actual
 * state of the merge rule until it silently discarded what a person had typed
 * (ADR 0096).
 *
 * Run in the container after the workspace build:
 *   node scripts/check-conformance.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const load = (name) => JSON.parse(readFileSync(require.resolve(`@mosaic-media/sdui/conformance/cases/${name}.json`), "utf8"));

const dist = (p) => pathToFileURL(new URL(`../packages/sdui-react/dist/${p}`, import.meta.url).pathname).href;
const { validateField, evaluate } = await import(dist("sdui/validate.js"));
const { resolveProps } = await import(dist("sdui/binding.js"));
const { expandOnce } = await import(dist("sdui/template.js"));
const { mergeSubmit } = await import(dist("sdui/submit.js"));

const failures = [];
let ran = 0;

/**
 * Compare trees by what they mean, not by how they were encoded.
 *
 * `{"type":"Box"}` and `{"type":"Box","props":{},"children":[]}` are the same
 * tree. An expander that always emits the empty containers is not wrong, and a
 * corpus that failed it would be asserting a serialisation rather than a
 * behaviour — which would fail a Swift client for emitting an empty dictionary
 * and teach nobody anything.
 *
 * So empties are dropped on both sides before comparison, recursively. What is
 * left is the part the corpus is actually about.
 */
const normalise = (v) => {
  if (Array.isArray(v)) return v.map(normalise);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const n = normalise(val);
      const empty =
        n === undefined ||
        n === null ||
        (Array.isArray(n) && n.length === 0) ||
        (typeof n === "object" && !Array.isArray(n) && Object.keys(n).length === 0) ||
        (typeof n === "string" && n === "" && (k === "id" || k === "type"));
      if (!empty) out[k] = n;
    }
    return out;
  }
  return v;
};

const check = (file, name, got, want) => {
  ran++;
  const g = JSON.stringify(normalise(got ?? null));
  const w = JSON.stringify(normalise(want ?? null));
  if (g !== w) failures.push(`${file} — ${name}\n      got  ${g}\n      want ${w}`);
};

for (const c of load("validators").cases) {
  check("validators", c.name, validateField(c.value, c.rules, c.values ?? {}), c.expect);
}

{
  const doc = load("predicates");
  for (const c of doc.cases) check("predicates", c.name, evaluate(c.predicate, doc.values), c.expect);
}

{
  const doc = load("bindings");
  // The client's resolver takes a lookup function rather than a bag, because a
  // binding resolves through a scope *chain*. The corpus states one scope, so
  // the lookup is that scope walked by dotted path.
  const lookup = (path) =>
    path.split(".").reduce((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), doc.scope);
  for (const c of doc.cases) check("bindings", c.name, resolveProps(c.props, lookup), c.expect);
}

for (const c of load("expansion").cases) {
  check("expansion", c.name, expandOnce(c.definition, c.node), c.expect);
}

for (const c of load("submit").cases) {
  check("submit", c.name, mergeSubmit(c.action, c.values ?? {}, c.into), c.expect);
}

if (failures.length > 0) {
  console.error(`check-conformance: ${failures.length} of ${ran} corpus cases disagree with the contract\n`);
  for (const f of failures) console.error(`  - ${f}\n`);
  process.exit(1);
}
console.error(`check-conformance: ${ran} corpus cases pass, against the same goldens the Go side runs.`);
