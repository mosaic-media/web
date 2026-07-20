# Mosaic Shell

A **server-driven-UI (SDUI) web client** for the [Mosaic](https://github.com/mosaic-media) self-hosted media platform. The Platform sends a tree of UI nodes; the Shell renders them. This repo is the **skeleton**: the SDUI runtime, the full component vocabulary, and a neutral, token-driven skin. The Mosaic Design Language will land on top of the tokens later — no component rewrites required.

> Status: `v0.0.1` — skeleton. Runs entirely on mock SDUI payloads; live GraphQL wiring is stubbed and lands once the Platform's SDUI/query surface stabilises.

## Why SDUI

The Platform (and its optional modules) decide *what* to show. The Shell only decides *how* a given node type looks. That means a new module can introduce a screen — even a new card type — without shipping a new client. Two choices mirror the Platform's own architecture:

1. **The component vocabulary is open.** An unknown node type renders a labelled `Unknown` placeholder instead of crashing (see `src/components/feedback/Unknown.tsx`) — the same open-vocabulary stance the Platform takes for media types (ADR 0015).
2. **Behaviour is data.** The server never sends code, only declarative `Action` envelopes (`navigate`, `invoke`, `openOverlay`, `playPart`, …) that the Shell interprets.

## Architecture

```
src/
  sdui/                 the runtime — framework-agnostic in spirit
    types.ts            UINode + Action envelope (the wire contract)
    registry.tsx        type string → React component
    Renderer.tsx        recursive tree walker (RenderNode / Children / Slot)
    context.tsx         ShellRuntime handed to every component
    ShellProvider.tsx   interprets every Action; owns overlays + toasts
  components/
    layout.tsx          Screen, Section, Carousel, Grid, Stack, Tabs, Divider, Spacer
    controls.tsx        Button, IconButton, Menu, SearchBar, TextField, Toggle,
                        Select, Slider, RatingControl, ProgressBar, Pagination
    media.tsx           PosterCard, HeroBanner, EpisodeRow, DetailHeader,
                        SeasonSelector, RelatedRail, SourcePicker, PlaybackBar,
                        PersonChip, GenreTag
    feedback.tsx        Skeleton, EmptyState, ErrorState, Banner, Badge, StatusIndicator
    host.tsx            OverlayHost + ToastHost (mounted once by the Shell)
    index.ts            installComponents() — registers the whole vocabulary
  styles/
    tokens.css          THE design seam — colours, spacing, radii, type, motion
    global.css          reset + base
    components.css       the skin (every class reads a token, nothing hardcoded)
  mock/screens.ts       sample SDUI payloads (home, detail, browse, search, settings)
  gallery/Gallery.tsx   live component gallery — every tile is a real UINode
  lib/platform.ts       GraphQL client (errors normalised to Platform categories)
  App.tsx               the chrome: sidebar + topbar + tiny screen router
```

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
- **Licensing** is not yet chosen for this repo — decide before first publish
  (the Platform is AGPL-3.0, the SDK Apache-2.0, modules MIT; a GraphQL client
  is a separate question). No `LICENSE` file is committed yet on purpose.
```
