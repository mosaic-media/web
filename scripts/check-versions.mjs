#!/usr/bin/env node
/**
 * Two checks over version numbers nobody maintains and everybody trusts.
 *
 * **1. A publishable package's version must match the repository's latest git
 * tag.**
 *
 * Go modules do not need this: a Go module *is* its tag, and a module can read
 * back whatever version was actually linked (`v1.ModuleVersion`), so the number
 * is structurally true rather than maintained. npm has no equivalent — a
 * `package.json` version is a literal somebody has to remember to change, and
 * a forgotten one publishes under the wrong number or, worse, silently fails to
 * publish at all because the version already exists.
 *
 * This is not hypothetical. Two Go modules in this project drifted from their
 * tags before the constants were removed — one by two releases — and both were
 * wrong in the least visible way available: a stale version looks exactly like
 * a correct one. npm is the same shape of problem with no structural fix, so it
 * gets a check instead.
 *
 * The rule matches what both repositories already do rather than imposing
 * something new: **the latest tag names the version of whatever the repository
 * publishes.** Private packages are exempt — they are not published, so their
 * version is bookkeeping and nothing depends on it being right.
 *
 * The tag check alone is skipped when there are no tags (a repository that has
 * never released) so a fresh clone does not fail on nothing. A git that cannot
 * *run* is a different thing entirely and fails — see `latestTag`.
 *
 * **2. The workspace must agree with itself about `@mosaic-media/*`.**
 *
 * Every consumer here compiles against one contract and one runtime, and npm
 * will happily give two of them two different ones. When a range stops matching
 * the workspace version — `packages/storybook` asking for `^0.17.0` after
 * sdui-react reached `0.19.0` — npm does not link the workspace copy and does
 * not complain. It installs the **published** package into that package's own
 * `node_modules`, where it shadows the workspace link, and the build stays
 * green because a two-versions-old runtime still compiles. The storybook, the
 * place you go to look at a component, then renders every one of them against
 * a client from before the change.
 *
 * The same thing happened to the Shell one commit earlier (380a10c) and was
 * fixed one package at a time, which is the argument for checking it: the fix
 * is obvious once seen and there was nothing to notice it a second time. So:
 * every `@mosaic-media/*` range in the workspace must be the same range, and
 * any range naming a package this workspace *contains* must be satisfied by
 * that package's current version — the condition npm uses to decide whether to
 * link it or to quietly go to the registry instead.
 *
 * Runs before `npm install` in both the container and verify.yml, so it depends
 * on nothing but Node.
 *
 * **Nothing here skips.** A workspace it cannot read, a range it cannot parse,
 * a git that will not run: each is reported and fails. A check that cannot tell
 * you it did not run is worse than no check, because the green tick is the same
 * either way — which is precisely how this script behaved about git until the
 * failure below was un-swallowed.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";

/** Everything this script could not read. Structural, so it is fatal on its own:
 * both checks below rest on having seen the whole workspace. */
const unread = [];

/** The newest tag by version order, or null when the repo has never tagged.
 *
 * A git that cannot run is not a repository with no tags, and telling the two
 * apart is most of this function. This script used to catch every failure here
 * and report "no tags yet — nothing to check against", exit 0 — so a missing
 * git (a `-slim` image ships none), a shallow clone, or git's "dubious
 * ownership" refusal on a bind mount all *passed by never running*. That is the
 * exact failure the check exists to prevent, wearing the check's own green
 * tick. Only the empty answer is benign now; the error is fatal. */
function latestTag() {
  let out;
  try {
    // Version-sorted rather than chronological: a patch tagged after a minor
    // is still the older release, and date order would call it the newest.
    // git's own stderr passes through — it says more about a broken repository
    // than this script can.
    out = execSync("git tag --sort=-v:refname", { encoding: "utf8" }).trim();
  } catch (err) {
    console.error(
      `check-versions: could not list git tags — ${err.message ?? err}\n\n` +
        `This is a failure, not an empty repository, and it is fatal because the\n` +
        `two are indistinguishable from the outside: a check that reports "nothing\n` +
        `to check" when git is missing is a check that silently stops running. If\n` +
        `git is genuinely absent from the image, install it; if the repository is\n` +
        `a shallow clone, fetch tags (fetch-depth: 0).\n`,
    );
    process.exit(1);
  }
  return out ? out.split("\n")[0] : null;
}

/** Every package.json this repo owns: the root, plus any npm workspaces.
 *
 * Expanded by hand rather than with fs.globSync, which needs Node 22 — CI runs
 * 20, and a version check that only runs on the maintainer's machine is the
 * kind of check that is quietly not running. Workspace patterns in practice are
 * `dir/*`, so that is what this handles, and anything else is reported rather
 * than skipped silently. */
function workspacePackages() {
  const files = ["package.json"];
  const root = JSON.parse(readFileSync("package.json", "utf8"));
  for (const pattern of root.workspaces ?? []) {
    if (!pattern.endsWith("/*")) {
      unread.push(
        `workspace pattern \`${pattern}\` is not \`dir/*\`, which is the only form this ` +
          `script expands — every package under it went unchecked.`,
      );
      continue;
    }
    const base = pattern.slice(0, -2);
    if (!existsSync(base)) {
      unread.push(`workspace pattern \`${pattern}\` names \`${base}/\`, which does not exist.`);
      continue;
    }
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const p = `${base}/${entry.name}/package.json`;
      if (existsSync(p)) files.push(p);
    }
  }
  return files.map((file) => ({ file, pkg: JSON.parse(readFileSync(file, "utf8")) }));
}

const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** `X.Y.Z` as numbers, or null for anything that is not exactly that. */
function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Whether `version` satisfies `range`, or null when the range is a form this
 * script does not read.
 *
 * Only an exact version and a caret, because those are what this workspace
 * writes, and a range guessed at wrong is a check reporting on something other
 * than what npm will do. Null is reported by the caller, never treated as a
 * pass. */
function satisfies(range, version) {
  const v = parseVersion(version);
  if (!v) return null;
  const caret = range.startsWith("^");
  const b = parseVersion(caret ? range.slice(1) : range);
  if (!b) return null;
  if (!caret) return cmp(v, b) === 0;
  if (cmp(v, b) < 0) return false;
  // npm's caret pins the leftmost non-zero component, so `^0.19.0` admits
  // 0.19.x and stops at 0.20.0. Pre-1.0 that makes every minor bump breaking
  // for a consumer's range, which is why sdui-react 0.18 → 0.19 is what
  // unlinked the workspace copy rather than something anyone did wrong.
  if (b[0] !== 0) return v[0] === b[0];
  if (b[1] !== 0) return v[0] === 0 && v[1] === b[1];
  return cmp(v, b) === 0;
}

/** Print a heading, its problems and its remedy. Returns true when it failed,
 * so every check reports before the process exits — one run, every problem. */
function report(problems, heading, remedy) {
  if (problems.length === 0) return false;
  console.error(`check-versions: ${heading}\n`);
  for (const p of problems) console.error(`  - ${p}\n`);
  console.error(remedy);
  return true;
}

const packages = workspacePackages();
let failed = report(
  unread,
  "this script could not read the whole workspace",
  `Everything below rests on having seen every package, so an unreadable one is\n` +
    `a failure rather than a smaller check. Fix the workspace patterns in the root\n` +
    `package.json, or teach this script the form they now take.\n`,
);

// ── 1. Published versions against the latest tag ───────────────────────────

const tag = latestTag();
const tagVersion = tag?.replace(/^v/, "");
const published = packages.filter(({ pkg }) => !pkg.private); // private: not published, so its version means nothing

if (!tag) {
  console.log("check-versions: no tags yet — no released version to check against");
} else if (published.length === 0) {
  console.log(`check-versions: no publishable packages — nothing to check against ${tag}`);
} else {
  const problems = published
    .filter(({ pkg }) => pkg.version !== tagVersion)
    .map(({ file, pkg }) => `${file}\n    ${pkg.name} is ${pkg.version}, but the latest tag is ${tag}`);
  failed =
    report(
      problems,
      `a published package disagrees with the latest tag (${tag})`,
      `Either bump the package version to ${tagVersion}, or tag the release\n` +
        `the package version claims. They have to agree: the tag is what a\n` +
        `consumer resolves and the package version is what npm serves, and when\n` +
        `they differ one of them is lying about what the other contains.\n`,
    ) || failed;
  if (problems.length === 0) {
    console.log(`check-versions: ${published.length} published package(s) agree with ${tag}`);
  }
}

// ── 2. The workspace against itself ────────────────────────────────────────

const SCOPE = "@mosaic-media/";
// peerDependencies are read for the workspace-link rule but not for the
// agreement rule: a peer range is meant to be wider than the dependency it
// pairs with, so demanding it be identical would be demanding it be wrong.
const AGREEING_GROUPS = ["dependencies", "devDependencies"];
const ALL_GROUPS = [...AGREEING_GROUPS, "peerDependencies"];

/** name → { file, version }, for every package this workspace contains. These
 * are the versions npm tests a range against when deciding whether to link. */
const local = new Map(packages.map(({ file, pkg }) => [pkg.name, { file, version: pkg.version }]));

/** dep name → every place it is ranged. */
const ranged = new Map();
for (const { file, pkg } of packages) {
  for (const group of ALL_GROUPS) {
    for (const [name, range] of Object.entries(pkg[group] ?? {})) {
      if (!name.startsWith(SCOPE) && !local.has(name)) continue;
      if (!ranged.has(name)) ranged.set(name, []);
      ranged.get(name).push({ file, group, range });
    }
  }
}

const drift = [];
for (const [name, sites] of [...ranged].sort(([a], [b]) => a.localeCompare(b))) {
  const agreeing = sites.filter((s) => AGREEING_GROUPS.includes(s.group));
  const distinct = [...new Set(agreeing.map((s) => s.range))];
  if (distinct.length > 1) {
    drift.push(
      `${name} is ranged ${distinct.length} different ways in one workspace:\n` +
        agreeing.map((s) => `      ${s.range}  ${s.file} (${s.group})`).join("\n") +
        `\n      One workspace compiles against one contract. Two ranges means npm resolves\n` +
        `      two copies and the packages disagree about what the server is sending them.`,
    );
  }

  const workspaceCopy = local.get(name);
  if (!workspaceCopy) continue;
  if (!parseVersion(workspaceCopy.version)) {
    drift.push(
      `${workspaceCopy.file} is in this workspace and something ranges it, but its version ` +
        `\`${workspaceCopy.version}\` is not \`X.Y.Z\` — so whether npm links it or fetches the ` +
        `published copy instead cannot be decided here.`,
    );
    continue;
  }
  for (const { file, group, range } of sites) {
    const ok = satisfies(range, workspaceCopy.version);
    if (ok === null) {
      drift.push(
        `${file} (${group}) ranges ${name} as \`${range}\`, which this script cannot read — ` +
          `it understands an exact version and a caret. A range it guesses at is a check that ` +
          `reports on something other than what npm will do, so it says so instead.`,
      );
      continue;
    }
    if (!ok) {
      drift.push(
        `${file} (${group}) wants ${name} \`${range}\`, but this workspace's copy is ` +
          `${workspaceCopy.version} (${workspaceCopy.file}).\n` +
          `      npm does not link a workspace package a range does not match, and does not say so:\n` +
          `      it installs the published ${name} into that package's own node_modules, where it\n` +
          `      shadows the link. The build stays green against a runtime nobody chose.`,
      );
    }
  }
}

failed =
  report(
    drift,
    "the workspace disagrees with itself about @mosaic-media/*",
    `Bring the ranges to the same version — the newest, unless there is a reason\n` +
      `written down — and where the range names a package in this workspace, make it\n` +
      `one that package's version satisfies. Then delete package-lock.json and\n` +
      `reinstall, because the lockfile records the resolution and not the intent: a\n` +
      `package-local node_modules copy of a workspace package survives a range fix\n` +
      `until the tree is resolved again.\n`,
  ) || failed;

if (drift.length === 0 && ranged.size > 0) {
  const summary = [...ranged]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([name, sites]) =>
        `${name} ${[...new Set(sites.map((s) => s.range))].join("/")}${local.has(name) ? " (workspace)" : ""}`,
    )
    .join(", ");
  console.log(`check-versions: ${packages.length} workspace package(s) agree on ${summary}`);
}

process.exit(failed ? 1 : 0);
