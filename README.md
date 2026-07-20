# Mosaic Shell

A **server-driven-UI (SDUI) web client** for the [Mosaic](https://github.com/mosaic-media) self-hosted media platform. The Platform sends a tree of UI nodes; the Shell renders them. This repo is the **skeleton**: the SDUI runtime, the full component vocabulary, and a neutral, token-driven skin. The Mosaic Design Language will land on top of the tokens later — no component rewrites required.

> Status: `v0.0.1` — skeleton. Runs entirely on mock SDUI payloads; live GraphQL wiring is stubbed and lands once the Platform's SDUI/query surface stabilises.

## Why SDUI

The Platform (and its optional modules) decide *what* to show. The Shell only decides *how* a given node type looks. That means a new module can introduce a screen — even a new card type — without shipping a new client. Two choices mirror the Platform's own architecture:

1. **The component vocabulary is open.** An unknown node type renders a labelled `Unknown` placeholder instead of crashing (see `src/components/feedback/Unknown.tsx`) — the same open-vocabulary stance the Platform takes for media types (ADR 0015).
2. **Behaviour is data.** The server never sends code, only declarative `Action` envelopes (`navigate`, `invoke`, `openOverlay`, `playPart`, …) that the Shell interprets.

## Architecture

Components sort into three tiers (see "The component model" below):

```
src/
  sdui/                 the runtime — framework-agnostic in spirit
    types.ts            UINode + Action envelope (the wire contract)
    style.ts            token-only style vocabulary (BoxStyle/TextStyle) → CSS
    registry.tsx        type string → React component
    Renderer.tsx        recursive tree walker (RenderNode / Children / Slot)
    template.tsx        ComponentDefinition + expander ($bind/$match/$each/…)
    context.tsx         ShellRuntime handed to every component
    ShellProvider.tsx   interprets every Action; owns overlays + toasts
  components/
    primitives.tsx      TIER 1 — Box, Text, Image, Icon, Pressable, Spacer,
                        Fragment, Outlet (the irreducible building blocks)
    definitions.ts      TIER 3 — presentational components AS primitive trees:
                        PosterCard, HeroBanner, EpisodeRow, DetailHeader,
                        PersonChip, GenreTag, SourcePicker, PlaybackBar, Button,
                        IconButton, Badge, Banner, StatusIndicator, EmptyState
    layout.tsx          TIER 2 native — Screen, Section, Carousel, Grid, Stack,
                        Tabs, Divider (CSS grid / scroll-snap / state)
    controls.tsx        TIER 2 native — Menu, SearchBar, TextField, Toggle,
                        Select, Slider, RatingControl, ProgressBar, Pagination
    media.tsx           TIER 2 native — SeasonSelector, RelatedRail
    feedback.tsx        TIER 2 native — Skeleton, ErrorState
    host.tsx            OverlayHost + ToastHost (mounted once by the Shell)
    index.ts            installComponents() — registers all three tiers
  styles/
    tokens.css          THE design seam — colours, spacing, radii, type, motion
    global.css          reset + base
    components.css       skin for the native tiers (primitives style inline from tokens)
  mock/screens.ts       sample SDUI payloads (home, detail, browse, search, settings)
  mock/moduleComponents.ts  a simulated module contributing components as data
  gallery/Gallery.tsx   live component gallery — every tile is a real UINode
  lib/platform.ts       GraphQL client (errors normalised to Platform categories)
  App.tsx               the chrome: sidebar + topbar + tiny screen router
```

### The component model

The key idea for a multi-client, module-extensible UI: a component is either a
**native leaf** (client code) or a **definition** (pure data). The split is by
what a static data tree can express, not by taste.

1. **Primitives** — the irreducible leaves. `Box`/`Text`/`Image`/`Icon`/
   `Pressable`/`Spacer` take a *token-only* style vocabulary (`sdui/style.ts`) —
   flex, spacing/colour/radius/type tokens, no raw px/hex, no `:hover`. That
   vocabulary is deliberately the **web ∩ Flutter** intersection, so the same
   node renders on any client.
2. **Native components** — containers and stateful/animated/computed widgets a
   static tree can't express (CSS grid, scroll-snap, local state, keyframes,
   enum→logic mapping). A bounded set, client-provided.
3. **Definitions** — presentational components expressed *as primitive trees*
   (`sdui/template.tsx`). This is what a **module** ships: a `ComponentDefinition`
   is data — a name, params, and a template of primitives — registered via
   `defineComponent`, at build time or delivered at runtime. Template markers:
   `{$bind}` (with dot paths), `{$match}` (enum→value), `$if`/`$ifNot`,
   `$each` (iteration), and `Outlet` (children/slot passthrough).

`components/definitions.ts` rebuilds the Shell's own presentational components
this way — the proof the vocabulary is expressive enough for a module to build
any look from data. `mock/moduleComponents.ts` simulates a module doing exactly
that (`module.StatChip`, `module.Panel`). Open the **Components** gallery to see
all three tiers live.

**Known boundaries** (each maps to a future vocab addition): converted buttons
drop per-variant `:hover` shifts (interaction state isn't static); bindings can't
compute (no substring, so a name-initial avatar shows the name); layout uses
flex-wrap rather than true responsive breakpoints.

### The wire contract

```ts
interface UINode {
  type: string;                       // open vocabulary, e.g. "PosterCard"
  id?: string;
  props?: Record<string, unknown>;    // component-specific data
  children?: UINode[];                // ordered children (containers)
  slots?: Record<string, UINode | UINode[]>; // named regions (e.g. hero actions)
}

type Action =
  | { kind: "navigate"; screen: string; params?: object }
  | { kind: "invoke"; mutation: string; input?: object }   // GraphQL mutation
  | { kind: "query"; query: string; variables?: object; into?: string }
  | { kind: "openOverlay"; surface?: "modal" | "sheet" | "drawer"; node: UINode }
  | { kind: "playPart"; partId: string }
  | { kind: "toast" | "openUrl" | "back" | "closeOverlay" | "sequence"; /* … */ };
```

Errors from the Platform are normalised into its seven fixed categories
(`InvalidArgument`, `Unauthenticated`, `PermissionDenied`, `NotFound`,
`Conflict`, `Unavailable`, `Internal`) so `ErrorState` and toasts render
uniformly regardless of transport detail.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

The **Components** item in the sidebar opens the gallery — every registered
component rendered live through the real registry. The dark/light toggle in the
top bar proves the token contract in both themes.

In dev, `/graphql` is proxied to the Platform (default `http://localhost:8081`,
override with `MOSAIC_PLATFORM_URL`). Nothing in the skeleton needs it running —
it renders the mock screens in `src/mock/screens.ts`.

```bash
npm run build      # type-check + production bundle to dist/
npm run typecheck  # types only
```

## Extending the vocabulary

Register a component and it becomes renderable:

```tsx
import { register } from "@/sdui/registry";
register("MyCard", ({ node }) => <div>{String(node.props?.title)}</div>);
```

Old Shells that don't know `MyCard` render the `Unknown` placeholder — forward
compatibility by construction.

## Notes & open threads

- **`RelatedRail`** renders an empty-state hint because `ContentService` can't
  read relations back yet (no `ListFrom`/`ListTo` on the published `v1`
  surface — see the Platform roadmap). It'll light up when that lands.
- **`playPart`** is acknowledged but not resolved — play-time stream resolution
  is a future Platform module (Remote Media). The Shell only expresses intent.
- **Module settings** (`settings` screen) demonstrate the form controls backing
  ADR 0021's user-managed, opaque module settings.
## Licensing

**AGPL-3.0-only** (see [`LICENSE`](LICENSE)); every source file carries an SPDX
header. This applies [ADR 0022](https://github.com/mosaic-media/mosaic-architecture/blob/main/docs/adr/0022-licensing.md):
the shell is a **first-party client**, part of the protected product, so it
matches the Platform's copyleft — as Jellyfin, Nextcloud and Immich all license
their official clients. It carries **no** Module Linking Exception (that frees
compiled-in modules; the shell links nothing into the Platform). The
technology-agnostic SDUI *contract*, when extracted, stays permissive like the
SDK — so third-party clients (in any language, any license) remain possible.
```
