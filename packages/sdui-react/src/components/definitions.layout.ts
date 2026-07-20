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

const screen: ComponentDefinition = {
  name: "Screen",
  template: {
    type: "Box",
    props: { style: { gap: 6 } },
    children: [
      { type: "Outlet", props: { name: "header" } },
      {
        type: "Box",
        props: { $if: { $bind: "title" }, style: { gap: 1 } },
        children: [
          { type: "Text", props: { text: { $bind: "title" }, style: { variant: "2xl", weight: "bold" } } },
          { type: "Text", props: { $if: { $bind: "subtitle" }, text: { $bind: "subtitle" }, style: { color: "text-muted" } } },
        ],
      },
      { type: "Box", props: { style: { gap: 6 } }, children: [{ type: "Outlet" }] },
    ],
  },
};

const section: ComponentDefinition = {
  name: "Section",
  params: { actionLabel: "See all" },
  template: {
    type: "Box",
    props: { style: { gap: 4 } },
    children: [
      {
        type: "Box",
        props: { $if: { $bind: "title" }, style: { direction: "row", align: "center", justify: "between", gap: 4 } },
        children: [
          { type: "Text", props: { text: { $bind: "title" }, style: { variant: "xl", weight: "bold" } } },
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
  params: { itemWidth: 168 },
  template: {
    type: "Box",
    props: { style: { layout: "grid", gridFlow: "column", gridAutoColumns: { $bind: "itemWidth" }, gap: 4, overflowX: "auto", snap: "x", py: 2 } },
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
 *  arithmetic; the server knows the page targets). */
const pagination: ComponentDefinition = {
  name: "Pagination",
  template: {
    type: "Box",
    props: { style: { direction: "row", align: "center", justify: "center", gap: 4 } },
    children: [
      {
        type: "Pressable",
        props: { action: { $bind: "prevAction" }, disabled: { $ifNot: { $bind: "hasPrev" } }, label: "Previous", style: { width: 38, height: 38, radius: "md", align: "center", justify: "center", color: "text-muted" } },
        children: [{ type: "Icon", props: { name: "chevron-right", size: "1.1em" } }],
      },
      { type: "Text", props: { text: { $bind: "label" }, style: { variant: "sm", color: "text-muted", tabular: true } } },
      {
        type: "Pressable",
        props: { action: { $bind: "nextAction" }, disabled: { $ifNot: { $bind: "hasNext" } }, label: "Next", style: { width: 38, height: 38, radius: "md", align: "center", justify: "center", color: "text-muted" } },
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
  section,
  stack,
  grid,
  carousel,
  divider,
  pagination,
  errorState,
  relatedRail,
];
