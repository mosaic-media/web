# @mosaic-media/sdui-react

The **React runtime** for the [Mosaic](https://github.com/mosaic-media) Server-Driven-UI contract — the web binding that turns an SDUI payload into rendered UI. Consumed by the Shell ([`mosaic-shell`](https://github.com/mosaic-media/mosaic-shell)), the component storybook ([`mosaic-storybook`](https://github.com/mosaic-media/mosaic-storybook)), and any other web surface — all as peers.

It is a **client implementation**, not the contract. The technology-agnostic contract (schema, standard definitions, tokens) lives in [`@mosaic-media/sdui`](https://github.com/mosaic-media/mosaic-sdui); this is one specific way to render it, in React. That's why it's **AGPL-3.0-only** (first-party client code) while the contract is Apache-2.0.

## What's in it

- **Primitives** — `Box`, `Text`, `Image`, `Icon`, `Pressable`, the form inputs, `Tabs`, `Menu`, … the irreducible, client-implemented vocabulary, styled from tokens.
- **Registry + renderer** — `register`/`resolve`, `RenderNode` (recursive tree walk), and the `Unknown` fallback for open-vocabulary forward-compat.
- **Definition expander** — `defineComponent` + the `$bind`/`$match`/`$each`/`$if`/`Outlet` template engine, so components delivered as data render like native ones.
- **Runtime** — `ShellProvider` (interprets `Action` envelopes, owns overlays + toasts), `useRuntime`, `OverlayHost`/`ToastHost`, and a GraphQL client.
- **Art-light** — the artwork-driven ambient "refraction" wash. An `Image` marked `artLight="ambient"|"focus"` samples its palette (canvas) and feeds it into the `--art-glow-*` tokens behind `--ambient`; the focused artwork colours the UI, falling back to the accent duo when nothing is in focus. Web-only enhancement; the fallback is always valid.
- **The token-driven skin** — shipped as `@mosaic-media/sdui-react/styles.css`.

## The skin is lightweight (for now)

The current visual skin is a **lightweight, first-pass skin** — enough to make the
whole SDUI vocabulary look coherent in both themes, not the final design. It's a
placeholder for the real **Mosaic Design Language**, which will replace it later.

What's here today:

- A **token palette** (`src/styles/tokens.css`) in the "refraction" language —
  cool violet-indigo glass in dark, warm pink-lavender glass in light. Every
  component reads these tokens; nothing hardcodes colour, spacing, radius or
  type. **Reskinning is editing this one file.**
- **Art-light**, a lightweight take on the concept's refraction system: the
  focused artwork is sampled (a small canvas, no colour-science library) and its
  hue drives both the ambient wash (`--art-glow-*`) and the accent every
  component derives from (`--accent-rgb` → buttons, nav, glows, focus rings).
  When no artwork is in focus it falls back to the brand accent duo — the
  fallback is always valid, so a client that omits art-light loses nothing.

When the Design Language lands it swaps the token values (and, if it wants,
retires art-light); the primitives, definitions and renderer don't change.

## Use it

```bash
npm install @mosaic-media/sdui-react react react-dom
```

```tsx
import {
  ShellProvider, RenderNode, installComponents, defineComponents,
} from "@mosaic-media/sdui-react";
import "@mosaic-media/sdui-react/styles.css";

installComponents();                 // register the built-in vocabulary
// defineComponents(moduleDefinitions) // + any definitions delivered as data

<ShellProvider screen="home" onNavigate={…} onBack={…} render={…}>
  <RenderNode node={payload} />
</ShellProvider>
```

For local cross-repo work (developing the runtime against a consumer), a
consumer can depend on it by path — `"@mosaic-media/sdui-react": "file:../mosaic-sdui-react"` — instead of the published version; the `prepare` script builds `dist` on install.

## Build

```bash
npm install      # runs prepare → build
npm run build    # tsc → dist + copy the CSS
npm run typecheck
```

Pure `tsc` build (source ships nothing; consumers get `dist` JS + `.d.ts`). React is a peer dependency.

## Releasing

`git tag v0.1.0 && git push origin v0.1.0` → `.github/workflows/release.yml` publishes to npm (needs an `NPM_TOKEN` secret for the `@mosaic-media` scope).

## Licence

**AGPL-3.0-only** (see [`LICENSE`](LICENSE)). See [ADR 0022–0024](https://github.com/mosaic-media/mosaic-architecture/tree/main/docs/adr) for the first-party-client licensing rationale.
