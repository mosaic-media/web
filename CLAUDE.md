# Claude Instructions — Mosaic Web

This repository is the **frontend workspace**
([ADR 0042](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0042-frontend-workspace.md)):
three npm packages in one repo, replacing three separate repositories that are
now archived.

| Package | What it is |
|---|---|
| `packages/shell` | the **Server-Driven-UI client** — the connection, a client-only `Standby` state, and the renderer. Nothing else. |
| `packages/sdui-react` | **`@mosaic-media/sdui-react`**, the published React runtime: primitives, registry, renderer, definition expander, token skin. |
| `packages/storybook` | a live storybook of the components, each shown beside its `UINode` JSON. Showcase, not runtime. |

AGPL-3.0-only — first-party client code, unlike the Apache-licensed contracts.

## The Shell renders. It does not decide.

This is the rule the whole client exists to hold, and it is broken by small
conveniences rather than by large mistakes.

- **No hardcoded layout, no hardcoded screens, no invented screen names.** The
  app shell itself is server-emitted
  ([ADR 0031](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0031-server-owned-app-shell.md)):
  the Platform sends a `shell` screen and the client fills its content region.
  Navigation swaps the content while the shell persists.
- **Actions are echoed, never authored.** A `NavItem`'s `navigate(screen)` comes
  from the server; the client dispatches it back. If you find yourself writing a
  screen name in this repository, that is the bug.
- **No hand-written controls, no inline styles.** A new user-facing affordance is
  a *server-emitted SDUI node* — composed with the `sdui/ui` builders on the
  Platform and rendered here through the component vocabulary and design tokens —
  not a bespoke `<button style={{…}}>` or hand-rolled markup in the Shell. If you
  reach for inline CSS or a hand-written control in `packages/shell`, stop and
  look in `sdui-react` (the primitives and their classes/tokens) and `sdui` (the
  `ui` builders and `definitions/*.json`) for what to emit instead.
  A player-region control (e.g. "Next episode") is a `Button` node the server
  puts in the region and `PlayerHost` renders via `RenderNode` — the chrome the
  host owns (frame, title bar, dismissal) is the *only* hand-written exception,
  and it is not a template for adding more.
- **This client contains no components, and adding one is the bug. Hard rule.**
  Every composition — a card, a row, a frame, a screen's chrome — is a
  **definition**: data, authored in the contract (`contracts`
  `definitions/*.json`) and pushed to this client by the Platform on connect
  ([ADR 0040](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0040-server-delivered-definitions-and-skin.md)).
  This package ships the **native vocabulary only**: primitives, the action kinds
  the dispatcher interprets, the style translation, the registry, the renderer
  and the definition expander.

  It was not always so, and the damage is the reason for the rule: ~30 components
  lived here as hand-written TypeScript, the Platform served a *dump of this
  package*, and the published contract carried a second copy of four of them —
  three had silently drifted. A component written here renders on the web and
  nowhere else, so a Flutter client would have had to reimplement all thirty from
  a source that was not the contract.

  The test is mechanical. **If a change adds a component, it belongs in the
  contract, not in a `.tsx` file here.** If it needs a new primitive, a new style
  field, or a new action kind, that is a *vocabulary* change — the one thing that
  genuinely needs a client release
  ([ADR 0024](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0024-primitives-and-definitions.md)) —
  so it is a deliberate decision: spec it in the contract so every client can
  implement it, bump `@mosaic-media/sdui-react`, and record it in the roadmap.
  Never a quiet edit riding along with the screen that wanted it.

  *(Worked example, both halves. The settings frame is a definition — data, no
  client release. Making it work on a phone needed something no client could
  express: `style.responsive` and `style.hidden`, so one payload can carry a
  desktop and a phone arrangement. That is a vocabulary change, so it came with
  `0.1.x → 0.2.0` and a roadmap entry. The screen is data; the capability it
  needed was a release.)*
- **No CSS rule for a layout.** `components.css` styles primitives and their
  interaction states. A `data-kind` hook plus a media query is how a *screen*
  ends up costing a client release; a layout that changes with the viewport says
  so in the payload, through `style.responsive`.
- **The one stated limit is the player** ([ADR 0047](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0047-player-as-client-primitive.md),
  [ADR 0070](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0070-the-web-player-is-the-browser.md)):
  the server owns everything about a playback session except the decoding
  pipeline and the transport controls. A scrub bar cannot be pushed over a
  network at frame rate. The renderer is a bare `<video>` element and stays one
  until the origin serves HLS.
- **Definitions are server-delivered data** ([ADR 0040](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0040-server-delivered-definitions-and-skin.md));
  the client bundles only the native vocabulary — not even a fallback set, which
  ADR 0040 allowed and ADR 0082 removed, because a bundled fallback is a second
  copy of every component and a second copy is what drifted. Growing the
  *primitive* set is the only thing that needs a client release, so it is a
  decision rather than a convenience.
- **One transport** ([ADR 0061](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0061-one-client-transport.md)):
  Connect, both services on one transport so the traceparent interceptor
  ([ADR 0054](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0054-the-correlation-id-is-the-trace-id.md))
  cannot be missing from half the calls. There is no GraphQL client and no
  second one to add.

## This client is measured against the contract, not trusted

Two checks run in the container after the build, and both exist because a client
that has drifted from the contract looks exactly like one that has not.

- **`scripts/check-vocabulary.mjs`** compares what this client declares it
  implements — `sdui/native.ts` — against the contract's published fixture. It
  refuses a type or kind the contract does not have, refuses a closed-set member
  missing in either direction, and refuses a change to `EXPECTED_GAP`, which
  names what the contract declares and this client does not implement. **Being
  behind the contract is a stated position, not an accident**: close a gap and
  you remove its entry in the same change.
- **`scripts/check-conformance.mjs`** runs the contract's corpus — the same
  golden cases the Go side runs. It covers all four files, including definition
  expansion, which the contracts repository publishes and cannot execute, having
  no expander. **So the expansion rules are checked here or nowhere.**

Adding a primitive means registering it *and* declaring it in `native.ts`; the
two are tied by a compile-time assertion, so forgetting one fails the build
rather than the screen.

## Publishing

`@mosaic-media/sdui-react` is published from CI, and **CI checks the published
version against the git tag** — they must match, so a release cannot silently be
a local build.

**Publishing is a pushed tag and nothing else.** `.github/workflows/release.yml`
fires on `push: tags: ["v*"]` and publishes the package. There is no
`npm publish` to run by hand, no registry token on any developer machine, and
asking for one is asking for the wrong thing. To release: bump the version,
commit, tag, push the tag. That check exists because the package once ran for weeks as an
unpublished local build in the Shell's `node_modules`, where a fresh
`npm install` would have reverted it.

**`@mosaic-media/sdui` is a published npm dependency, not a link to the sibling
checkout.** In the ordinary dev stack the version in
`packages/shell/package.json` is the only thing that decides what the client is
compiled against — a bind mount of `../contracts` on its own changes nothing,
because nothing installs from it. `platform`'s `docker-compose.local.yml` overlay
is the one exception and it is explicit about it: it mounts `../contracts`,
`npm pack`s that checkout and installs the tarball into the Shell and the
storybook, so there a local contract edit does reach this client.
**A stale one fails silently and is very hard to see.**
Connect-ES serialises only the fields in the schema it was built with, so when
the Shell was pinned to `0.9.0` and the Platform had already shipped
`ClientProfile` in `0.10.0`, the client sent the field, the wire dropped it, the
call returned `200`, and the server saw `nil`. Nothing errored anywhere. If a
new contract field appears not to arrive, check the installed version before
suspecting the code — and bump the dependency in the same change that starts
using the field.

**Bump every consumer's range together, and never leave one behind.**
`check-versions.mjs` now refuses a workspace whose packages range
`@mosaic-media/*` differently, and refuses a range that the workspace's own
`sdui-react` version does not satisfy. Both rules exist because the second
condition is exactly what npm uses to decide whether to link `packages/sdui-react`
or to go to the registry instead — and it goes to the registry *silently*,
installing the published package into the consumer's own `node_modules` where
it shadows the link. It happened twice: the Shell at `^0.17.0` (380a10c) and
then the storybook, left on `^0.17.0`/`^0.41.0` for another eleven contract
releases while `npm run build --workspaces` stayed green. A range fix alone
does not undo it — the lockfile records the resolution, so delete
`package-lock.json` and reinstall.

## Everything runs in the container, nothing runs on the host

**Do not run `npm install`, `npm run build`, `vite` or `tsc` directly on this
machine.** This repository's gates run inside its test container:

```bash
docker compose -f docker-compose.test.yml run --rm test
```

That runs the version check, `npm install`, and the build and typecheck across
every workspace package. Append `bash` for a shell in the same environment.

Two reasons, and the second is specific to this repository:

- **`npm install` is the worst thing you can do to a shared checkout.** It
  writes tens of thousands of files and platform-native binaries into
  `node_modules`. A host-side install leaves macOS artefacts where the dev
  stack then mounts Linux ones, or fails to, and the resulting breakage points
  anywhere but at its cause. The container keeps installs in named volumes, so
  the two can never meet.
- **`scripts/check-versions.mjs` needs a working git**, so the container uses
  the full Node image rather than `-slim` (which ships no git). It used to
  *catch* a git failure and report "no tags yet — nothing to check against",
  exit 0, which made a missing or unhappy git pass by finding nothing; it now
  distinguishes a repository with no tags from a git that cannot run and fails
  on the second. The `git rev-parse` in the compose command is redundancy
  rather than the load-bearing guard it once was.

**To see the client, run the dev stack** rather than `npm run dev` — it is in
the Platform repository and brings the Shell, the Platform and its database up
together, with the Shell on `:5173`:

```bash
docker compose -f docker-compose.dev.yml up
```

## Workflow

- Commit and push this repository **separately** from `platform`.
- **Commit author identity** must be `AdamNi-7080 <anicholls41@gmail.com>`.
- The test container green before pushing; a change to `sdui-react` is a change
  to both consumers, and the container builds all of them.
- **Verify in a browser against the running Platform**, not only against the
  storybook. Every bug that mattered here — the action ABI, the empty home
  screen, the container hidden in a query parameter — was invisible until a real
  screen rendered real data. The container makes the build honest; it says
  nothing about whether the screen is right.

## The roadmap and the decision records

These rules are identical in every Mosaic repository. They exist because the
state of the build and the reasons behind it are the two things that rot fastest
and report nothing when they do — no build fails, no test goes red.

### The roadmap is maintained, not consulted

**`docs/roadmap.md` in [`architecture`](https://github.com/mosaic-media/architecture)
is the single record of where the build is.** Read it before starting work, and
**update it in the same session as the change that dates it** — not in a
follow-up, which does not happen.

- **A slice that lands is marked landed, with what was left out.** "Built" with
  no qualifier is a claim that the whole slice shipped; if part of it did not,
  say which part and why in the same sentence.
- **Implementation that departs from the plan is recorded where it departed.**
  The roadmap is derived from the code, not from the intention that preceded it,
  and the surprises are the most valuable thing in it.
- **Do not restate the roadmap here.** A second copy of "what is built" in a
  `CLAUDE.md` is how the first copy goes stale unnoticed. This file carries how
  to work in *this* repository; the roadmap carries what has been done across all
  of them.
- **A capability with no client path is not done — it is
  [owed](https://github.com/mosaic-media/architecture/blob/main/docs/unreachable-capability.md).**
  This repository is where most of that debt is discharged: a service with no
  screen is a row on that register, and building the screen is what removes it.

### Decision records are append-only

An ADR is an account of what was decided and why, at a time. It is evidence, not
documentation, and its value is that it was not edited afterwards.

- **Never rewrite a record's body to match what was built.** Not to correct it,
  not to annotate it, not to add "as built, this differs". That pattern turns a
  record into a running commentary and destroys the thing it is for.
- **State changes in the `**Status:**` line, and nowhere else.** That is where a
  record says it is built, built in part (naming the part), or superseded —
  wholly ("Superseded by ADR N") or partly ("Partly superseded: X was reversed by
  ADR N; the rest stands").
- **A changed decision needs a new record that supersedes it.** If the code
  deliberately does something a record decided against, that is a decision and it
  is written down as one, with its own Context / Decision / Alternatives /
  Consequences. Both records then stand: the old one keeps its reasoning, the new
  one carries the change. [ADR 0070](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0070-the-web-player-is-the-browser.md)
  is the worked example, and it came out of this repository.
- **An unbuilt decision is not a superseded one.** "We have not done this yet"
  belongs in the Status line and the roadmap. Only a genuine reversal earns a new
  record.
- **Records live only in `architecture/docs/adr/`**, numbered sequentially in
  kebab-case. Adding one means adding it to `nav:` in `mkdocs.yml`, and
  `mkdocs build --strict` must pass.

**If the code and a record disagree, say so rather than quietly picking one.** An
honest "this is unresolved" is worth more than a plausible reconciliation that
reads as settled.
