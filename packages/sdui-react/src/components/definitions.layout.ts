// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Container & compositional definitions. Everything here used to be a bespoke
 * native component; each is now a primitive tree. What made them "need" native
 * code turned out to be expressible once the vocabulary grew:
 *   - Grid / Carousel  → Box grid/scroll layout modes (sdui/style.ts)
 *   - Divider          → flex line via Box
 *   - Section / Screen → $if headers + Outlet
 *   - Pagination       → server-provided prev/next actions (no client arithmetic)
 *   - ErrorState       → $match on the Platform error category
 *   - RelatedRail      → $childCount injected into args (empty-vs-populated)
 */

import type { ComponentDefinition } from "../sdui/template";

/* Screen — the root of a page. The app frame's content region is now a bare
 * full-width scroll box (no gutter), so the Screen owns its own layout: an
 * optional full-width `bleed` slot (a cinematic hero that spans edge to edge),
 * then a gutter-padded body for the titled content. Screens that pass only
 * children get exactly the old padded column; `bleed` is additive. */
const screen: ComponentDefinition = {
  name: "Screen",
  template: {
    type: "Box",
    props: { style: { direction: "column", gap: 0 } },
    children: [
      { type: "Outlet", props: { name: "header" } },
      { type: "Outlet", props: { name: "bleed" } },
      {
        // pt clears the floating top nav; pb clears the mobile floating tab pill.
        // gap:8 gives generous breathing room between rows (less crowded).
        // $if $childCount: a screen that puts everything in `bleed` (e.g. the home
        // hero + its content sheet) collapses this padded body instead of leaving
        // an empty gutter block below.
        type: "Box",
        props: { $if: { $bind: "$childCount" }, style: { direction: "column", gap: 8, px: "gutter", pt: 9, pb: 9 } },
        children: [
          {
            type: "Box",
            props: { $if: { $bind: "title" }, style: { gap: 1 } },
            children: [
              { type: "Text", props: { text: { $bind: "title" }, style: { variant: "2xl", weight: "bold" } } },
              { type: "Text", props: { $if: { $bind: "subtitle" }, text: { $bind: "subtitle" }, style: { color: "text-muted" } } },
            ],
          },
          { type: "Box", props: { style: { direction: "column", gap: 6 } }, children: [{ type: "Outlet" }] },
        ],
      },
    ],
  },
};

/* AppShell — the application frame, now a primitive-tree DEFINITION rather than
 * bespoke React (ADR 0031, ADR 0024's model): a top navigation bar (brand +
 * horizontal `nav` slot + a `topbar` slot for search/account) over a
 * viewport-tall, vertically scrolling `content` region. Because it is data, the
 * frame's shape is server-owned — changing it is a definition edit, not a client
 * release. NavItem stays a primitive (it owns active-route state). The content
 * region carries no gutter, so a Screen's `bleed` hero can span edge to edge. */
const appShell: ComponentDefinition = {
  name: "AppShell",
  params: { title: "Mosaic" },
  template: {
    type: "Box",
    props: { style: { position: "relative", direction: "column", height: "screen" } },
    children: [
      {
        // The content fills the frame and scrolls — edge to edge, corner to
        // corner. There is NO nav band; the artwork is never boxed in. The nav
        // (below) floats over this.
        type: "Box",
        props: { style: { direction: "column", grow: true, overflowY: "auto" } },
        children: [{ type: "Outlet", props: { name: "content" } }],
      },
      {
        // Floating nav — no background of its own. The brand (= Home), the
        // centred search and the avatar sit directly over the artwork as
        // individual controls (each with its own edge-light). Absolute + z so it
        // overlays the content instead of claiming a strip of the screen.
        type: "Box",
        props: { style: { position: "absolute", top: 0, left: 0, right: 0, z: "overlay", direction: "row", align: "center", gap: 4, px: "gutter", py: 3 } },
        children: [
          {
            type: "Pressable",
            props: { action: { kind: "navigate", screen: "home" }, label: "Home", style: { direction: "row", align: "center", gap: 3 } },
            children: [
              { type: "Box", props: { style: { width: 26, height: 26, radius: "sm", bgGradient: { from: "accent", to: "info", angle: 135 }, shadow: "1" } } },
              { type: "Text", props: { text: { $bind: "title" }, style: { variant: "lg", weight: "bold", transform: "uppercase", tracking: "wide" } } },
            ],
          },
          {
            // Centred search — the star of the desktop bar. On mobile search is
            // a bottom-tab screen instead, so this hides (data-kind="top-search").
            type: "Box",
            props: { style: { direction: "row", align: "center", justify: "center", grow: true, minWidth: 180, kind: "top-search" } },
            children: [{ type: "Outlet", props: { name: "topbar" } }],
          },
          {
            // Avatar menu (Collections + Settings) — desktop only; mobile uses the
            // bottom tab bar (data-kind="account").
            type: "Box",
            props: { style: { direction: "row", align: "center", gap: 3, kind: "account" } },
            children: [{ type: "Outlet", props: { name: "account" } }],
          },
        ],
      },
      {
        // Mobile bottom tab bar — a normal flex child at the foot of the
        // viewport-tall column. Hidden on desktop (components.css).
        type: "NavBar",
        children: [{ type: "Outlet", props: { name: "nav" } }],
      },
    ],
  },
};

const section: ComponentDefinition = {
  name: "Section",
  params: { actionLabel: "See all" },
  template: {
    type: "Box",
    props: { style: { gap: 5 } },
    children: [
      {
        type: "Box",
        props: { $if: { $bind: "title" }, style: { direction: "row", align: "center", justify: "between", gap: 4 } },
        children: [
          { type: "Text", props: { text: { $bind: "title" }, style: { variant: "xl", weight: "bold", tracking: "tight" } } },
          {
            type: "Pressable",
            props: { $if: { $bind: "action" }, action: { $bind: "action" }, style: { direction: "row", align: "center", gap: 1, color: "text-muted" } },
            children: [
              { type: "Text", props: { text: { $bind: "actionLabel" }, style: { variant: "sm", weight: "medium" } } },
              { type: "Icon", props: { name: "chevron-right", size: "1em" } },
            ],
          },
        ],
      },
      { type: "Outlet" },
    ],
  },
};

const stack: ComponentDefinition = {
  name: "Stack",
  params: { direction: "vertical", gap: 4 },
  template: {
    type: "Box",
    props: {
      style: {
        direction: { $match: { on: { $bind: "direction" }, cases: { horizontal: "row", vertical: "column" }, default: "column" } },
        gap: { $bind: "gap" },
        align: { $bind: "align" },
        justify: { $bind: "justify" },
        wrap: { $bind: "wrap" },
      },
    },
    children: [{ type: "Outlet" }],
  },
};

const grid: ComponentDefinition = {
  name: "Grid",
  params: { minColumnWidth: 172 },
  template: {
    type: "Box",
    props: { style: { layout: "grid", gridMin: { $bind: "minColumnWidth" }, gap: 4 } },
    children: [{ type: "Outlet" }],
  },
};

const carousel: ComponentDefinition = {
  name: "Carousel",
  params: { itemWidth: 210 },
  template: {
    type: "Box",
    props: { style: { layout: "grid", gridFlow: "column", gridAutoColumns: { $bind: "itemWidth" }, gap: 6, overflowX: "auto", snap: "x", py: 2 } },
    children: [{ type: "Outlet" }],
  },
};

const divider: ComponentDefinition = {
  name: "Divider",
  template: {
    type: "Fragment",
    children: [
      { type: "Box", props: { $ifNot: { $bind: "label" }, style: { height: 1, bg: "border" } } },
      {
        type: "Box",
        props: { $if: { $bind: "label" }, style: { direction: "row", align: "center", gap: 3 } },
        children: [
          { type: "Box", props: { style: { height: 1, bg: "border", grow: true } } },
          { type: "Text", props: { text: { $bind: "label" }, style: { variant: "xs", color: "text-faint", transform: "uppercase" } } },
          { type: "Box", props: { style: { height: 1, bg: "border", grow: true } } },
        ],
      },
    ],
  },
};

/** Pagination — server supplies prev/next actions + enabled flags (no client
 *  arithmetic; the server knows the page targets). Arrows are circular
 *  bordered buttons; the label is optional (arrow-only rails omit it). */
const pageArrow = { width: 34, height: 34, radius: "pill", align: "center", justify: "center", bg: "surface-raised", border: true, color: "text-muted" };
const pagination: ComponentDefinition = {
  name: "Pagination",
  template: {
    type: "Box",
    props: { style: { direction: "row", align: "center", justify: "center", gap: 3 } },
    children: [
      {
        type: "Pressable",
        props: { action: { $bind: "prevAction" }, disabled: { $ifNot: { $bind: "hasPrev" } }, label: "Previous", style: pageArrow },
        children: [{ type: "Icon", props: { name: "chevron-left", size: "1.1em" } }],
      },
      { type: "Text", props: { $if: { $bind: "label" }, text: { $bind: "label" }, style: { variant: "sm", color: "text-muted", tabular: true } } },
      {
        type: "Pressable",
        props: { action: { $bind: "nextAction" }, disabled: { $ifNot: { $bind: "hasNext" } }, label: "Next", style: pageArrow },
        children: [{ type: "Icon", props: { name: "chevron-right", size: "1.1em" } }],
      },
    ],
  },
};

const errorState: ComponentDefinition = {
  name: "ErrorState",
  params: { category: "Internal" },
  template: {
    type: "Box",
    props: { style: { align: "center", gap: 2, p: 6, radius: "lg", border: true, bg: "surface" } },
    children: [
      {
        type: "Icon",
        props: {
          name: { $match: { on: { $bind: "category" }, cases: { InvalidArgument: "warning", PermissionDenied: "warning", Conflict: "warning", Unauthenticated: "info", NotFound: "info" }, default: "error" } },
          color: { $match: { on: { $bind: "category" }, cases: { InvalidArgument: "warning", PermissionDenied: "warning", Conflict: "warning", Unauthenticated: "info", NotFound: "text-faint" }, default: "danger" } },
          size: 28,
        },
      },
      {
        type: "Text",
        props: {
          text: {
            $match: {
              on: { $bind: "category" },
              cases: {
                InvalidArgument: "That didn't look right",
                Unauthenticated: "Please sign in",
                PermissionDenied: "Not allowed",
                NotFound: "Nothing here",
                Conflict: "Already exists",
                Unavailable: "Platform unavailable",
                Internal: "Something went wrong",
              },
              default: "Something went wrong",
            },
          },
          style: { variant: "lg", weight: "bold" },
        },
      },
      { type: "Text", props: { $if: { $bind: "message" }, text: { $bind: "message" }, style: { color: "text-muted", align: "center" } } },
      { type: "Text", props: { text: { $bind: "category" }, style: { variant: "xs", color: "text-faint", mono: true } } },
      {
        type: "Pressable",
        props: { $if: { $bind: "retry" }, action: { $bind: "retry" }, style: { direction: "row", align: "center", justify: "center", gap: 2, px: 4, py: 3, radius: "md", bg: "surface-raised", border: true, borderColor: "border-strong" } },
        children: [{ type: "Text", props: { text: "Try again", style: { weight: "medium" } } }],
      },
    ],
  },
};

const relatedRail: ComponentDefinition = {
  name: "RelatedRail",
  params: { title: "Related" },
  template: {
    type: "Box",
    props: { style: { gap: 4 } },
    children: [
      { type: "Text", props: { text: { $bind: "title" }, style: { variant: "xl", weight: "bold" } } },
      { type: "Carousel", props: { $if: { $bind: "$childCount" } }, children: [{ type: "Outlet" }] },
      {
        type: "Box",
        props: { $ifNot: { $bind: "$childCount" }, style: { p: 4, radius: "md", border: true, borderColor: "border-strong" } },
        children: [{ type: "Text", props: { text: "No related titles yet.", style: { variant: "sm", color: "text-faint" } } }],
      },
    ],
  },
};

export const LAYOUT_DEFINITIONS: ComponentDefinition[] = [
  screen,
  appShell,
  section,
  stack,
  grid,
  carousel,
  divider,
  pagination,
  errorState,
  relatedRail,
];
