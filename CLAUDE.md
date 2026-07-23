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
- **The one stated limit is the player** ([ADR 0047](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0047-player-as-client-primitive.md),
  [ADR 0070](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0070-the-web-player-is-the-browser.md)):
  the server owns everything about a playback session except the decoding
  pipeline and the transport controls. A scrub bar cannot be pushed over a
  network at frame rate. The renderer is a bare `<video>` element and stays one
  until the origin serves HLS.
- **Definitions are server-delivered data** ([ADR 0040](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0040-server-delivered-definitions-and-skin.md));
  the client bundles only the native vocabulary and a fallback. Growing the
  *primitive* set is the only thing that needs a client release, so it is a
  decision rather than a convenience.
- **One transport** ([ADR 0061](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0061-one-client-transport.md)):
  Connect, both services on one transport so the traceparent interceptor
  ([ADR 0054](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0054-the-correlation-id-is-the-trace-id.md))
  cannot be missing from half the calls. There is no GraphQL client and no
  second one to add.

## Publishing

`@mosaic-media/sdui-react` is published from CI, and **CI checks the published
version against the git tag** — they must match, so a release cannot silently be
a local build. That check exists because the package once ran for weeks as an
unpublished local build in the Shell's `node_modules`, where a fresh
`npm install` would have reverted it.

**`@mosaic-media/sdui` is a published npm dependency, not a link to the sibling
checkout.** Mounting `../sdui` into the dev container does nothing for the
Shell; only the version in `packages/shell/package.json` decides what the client
is compiled against. **A stale one fails silently and is very hard to see.**
Connect-ES serialises only the fields in the schema it was built with, so when
the Shell was pinned to `0.9.0` and the Platform had already shipped
`ClientProfile` in `0.10.0`, the client sent the field, the wire dropped it, the
call returned `200`, and the server saw `nil`. Nothing errored anywhere. If a
new contract field appears not to arrive, check the installed version before
suspecting the code — and bump the dependency in the same change that starts
using the field.

## Workflow

- Commit and push this repository **separately** from `platform`.
- **Commit author identity** must be `AdamNi-7080 <anicholls41@gmail.com>`.
- Build and typecheck every affected workspace package before pushing; a change
  to `sdui-react` is a change to both consumers.
- **Verify in a browser against the running Platform**, not only against the
  storybook. Every bug that mattered here — the action ABI, the empty home
  screen, the container hidden in a query parameter — was invisible until a real
  screen rendered real data.

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
