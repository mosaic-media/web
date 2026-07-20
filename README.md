# Mosaic Storybook

A live, **bespoke** storybook for the [Mosaic](https://github.com/mosaic-media) Server-Driven-UI component library. Every component is rendered from real SDUI data through [`@mosaic-media/sdui-react`](https://github.com/mosaic-media/mosaic-sdui-react), shown beside the `UINode` payload that produced it.

> **Live:** [mosaic-media.github.io/mosaic-storybook](https://mosaic-media.github.io/mosaic-storybook)

## Why bespoke (not Storybook.js)

Mosaic's "components" aren't React components with prop APIs — they're **definitions expressed as data** ([ADR 0024](https://github.com/mosaic-media/mosaic-architecture/blob/main/docs/adr/0024-primitives-and-definitions.md)). So the useful documentation isn't args/controls; it's the **`UINode` JSON** a producer sends. This storybook shows exactly that: the rendered result and the payload, side by side. It's the real renderer (`@mosaic-media/sdui-react`) over real contract data — not a mock.

## What it shows

Primitives, layout, media, controls, feedback, and **module-defined** components (contributed as pure `ComponentDefinition` data, registered at runtime — proving a module needs no client code). An unregistered type renders the `Unknown` placeholder, demonstrating open-vocabulary forward-compat.

## Stack

- [`@mosaic-media/sdui-react`](https://github.com/mosaic-media/mosaic-sdui-react) — the renderer (primitives, registry, expander, token skin).
- [`@mosaic-media/sdui`](https://github.com/mosaic-media/mosaic-sdui) — the contract (types, definitions, tokens).
- React + TypeScript + Vite, deployed to GitHub Pages by `.github/workflows/deploy-pages.yml`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173/mosaic-storybook/
npm run build    # static site → dist/
```

The examples live in `src/catalog.ts` — add a `Demo` (a name + a `UINode`) and it appears with its rendered output and JSON. `src/moduleExamples.ts` simulates a module contributing components as data.

## Licence

**AGPL-3.0-only** (it embeds the AGPL runtime). See [`LICENSE`](LICENSE).
