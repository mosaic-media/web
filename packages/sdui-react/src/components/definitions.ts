// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Platform component definitions — components expressed purely as primitive
 * trees rather than bespoke React. This is the target model (step B): a
 * presentational component is data, not code, so any client renders it and a
 * module can define its own the same way.
 *
 * PosterCard is the first proof: if the primitive vocabulary can rebuild one of
 * the Shell's own components, it can build a module's. Interaction flourish that
 * needs real hover/animation (the play-overlay reveal) is intentionally dropped
 * here — that belongs to interactive primitives, not to static composition.
 */

import type { ComponentDefinition } from "../sdui/template";

const posterCard: ComponentDefinition = {
  name: "PosterCard",
  params: { title: "Untitled" },
  template: {
    type: "Pressable",
    props: { action: { $bind: "action" }, lift: true, style: { gap: 2 } },
    children: [
      {
        // art
        type: "Box",
        props: {
          style: {
            position: "relative",
            radius: "md",
            overflow: "hidden",
            aspectRatio: "2 / 3",
            bg: "surface-raised",
            border: true,
            shadow: "2",
          },
        },
        children: [
          {
            type: "Image",
            props: {
              src: { $bind: "poster" },
              alt: { $bind: "title" },
              placeholder: { $bind: "mediaType" },
              artLight: "focus",
              style: { width: "full", height: "full" },
            },
          },
          {
            type: "Box",
            props: {
              $if: { $bind: "badge" },
              style: { position: "absolute", top: 2, left: 2, bg: "surface-overlay", glass: true, border: true, radius: "sm", px: 2, py: 1 },
            },
            children: [{ type: "Text", props: { text: { $bind: "badge" }, style: { variant: "xs", weight: "medium" } } }],
          },
          {
            type: "Box",
            props: { $if: { $bind: "progress" }, style: { position: "absolute", left: 2, right: 2, bottom: 2 } },
            children: [{ type: "ProgressBar", props: { value: { $bind: "progress" } } }],
          },
        ],
      },
      {
        // meta
        type: "Box",
        children: [
          { type: "Text", props: { text: { $bind: "title" }, style: { variant: "sm", weight: "medium", lineClamp: 1 } } },
          {
            type: "Text",
            props: { $if: { $bind: "subtitle" }, text: { $bind: "subtitle" }, style: { variant: "xs", color: "text-muted" } },
          },
        ],
      },
    ],
  },
};

// tone → colour-token maps, shared by the feedback definitions.
const toneBg = {
  $match: {
    on: { $bind: "tone" },
    cases: { accent: "accent-quiet", success: "success-quiet", warning: "warning-quiet", danger: "danger-quiet", info: "info-quiet" },
    default: "surface-overlay",
  },
};
const toneFg = {
  $match: {
    on: { $bind: "tone" },
    cases: { accent: "accent", success: "success", warning: "warning", danger: "danger", info: "info" },
    default: "text-muted",
  },
};
const toneSolid = {
  $match: {
    on: { $bind: "tone" },
    cases: { accent: "accent", success: "success", warning: "warning", danger: "danger", info: "info" },
    default: "text-faint",
  },
};

/** Badge — tone drives a quiet tint background + solid text via $match. */
const badge: ComponentDefinition = {
  name: "Badge",
  params: { tone: "neutral" },
  template: {
    type: "Box",
    props: { style: { direction: "row", align: "center", bg: toneBg, color: toneFg, radius: "sm", px: 2 } },
    children: [{ type: "Text", props: { text: { $bind: "label" }, style: { variant: "xs", weight: "medium" } } }],
  },
};

/** StatusIndicator — a coloured dot + optional label. */
const statusIndicator: ComponentDefinition = {
  name: "StatusIndicator",
  params: { tone: "neutral" },
  template: {
    type: "Box",
    props: { style: { direction: "row", align: "center", gap: 2 } },
    children: [
      { type: "Box", props: { style: { width: 9, height: 9, radius: "pill", bg: toneSolid } } },
      { type: "Text", props: { $if: { $bind: "label" }, text: { $bind: "label" }, style: { variant: "sm", color: "text-muted" } } },
    ],
  },
};

/** Banner — tone drives the border colour + icon; title is optional. */
const banner: ComponentDefinition = {
  name: "Banner",
  params: { tone: "info" },
  template: {
    type: "Box",
    props: {
      style: {
        direction: "row",
        gap: 3,
        align: "start",
        px: 4,
        py: 3,
        radius: "md",
        bg: "surface-raised",
        border: true,
        borderColor: { $match: { on: { $bind: "tone" }, cases: { success: "success", warning: "warning", danger: "danger", info: "info" }, default: "border" } },
      },
    },
    children: [
      {
        type: "Icon",
        props: {
          name: { $match: { on: { $bind: "tone" }, cases: { success: "success", warning: "warning", danger: "error", info: "info" }, default: "info" } },
          color: toneSolid,
        },
      },
      {
        type: "Box",
        props: { style: { gap: 0 } },
        children: [
          { type: "Text", props: { $if: { $bind: "title" }, text: { $bind: "title" }, style: { variant: "sm", weight: "bold" } } },
          { type: "Text", props: { text: { $bind: "message" }, style: { variant: "sm" } } },
        ],
      },
    ],
  },
};

/** PersonChip — avatar (with letter fallback) + name/role. */
const personChip: ComponentDefinition = {
  name: "PersonChip",
  template: {
    type: "Pressable",
    props: { action: { $bind: "action" }, style: { direction: "row", align: "center", gap: 3, p: 1, radius: "md" } },
    children: [
      {
        type: "Box",
        props: { style: { width: 42, height: 42, radius: "pill", overflow: "hidden", bg: "surface-overlay", align: "center", justify: "center" } },
        children: [{ type: "Image", props: { src: { $bind: "avatar" }, placeholder: { $bind: "name" }, placeholderMode: "initials", style: { width: "full", height: "full" } } }],
      },
      {
        type: "Box",
        children: [
          { type: "Text", props: { text: { $bind: "name" }, style: { variant: "sm", weight: "medium" } } },
          { type: "Text", props: { $if: { $bind: "role" }, text: { $bind: "role" }, style: { variant: "xs", color: "text-muted" } } },
        ],
      },
    ],
  },
};

/** SourcePicker — one Pressable per source via $each + dot-path bindings. */
const sourcePicker: ComponentDefinition = {
  name: "SourcePicker",
  template: {
    type: "Box",
    props: { style: { gap: 2 } },
    children: [
      {
        type: "Pressable",
        props: {
          $each: { $bind: "sources" },
          $as: "s",
          action: { $bind: "s.action" },
          style: { direction: "row", align: "center", gap: 3, px: 4, py: 3, radius: "md", border: true, bg: "surface-raised" },
        },
        children: [
          { type: "Icon", props: { name: "play", color: "accent" } },
          { type: "Text", props: { text: { $bind: "s.label" }, style: { variant: "md", weight: "medium" } } },
          { type: "Spacer", props: { grow: true } },
          { type: "Text", props: { $if: { $bind: "s.quality" }, text: { $bind: "s.quality" }, style: { variant: "xs", color: "accent" } } },
          { type: "Text", props: { $if: { $bind: "s.provider" }, text: { $bind: "s.provider" }, style: { variant: "xs", color: "text-faint" } } },
        ],
      },
    ],
  },
};

/** EmptyState — icon medallion + copy + an optional action (Outlet). */
const emptyState: ComponentDefinition = {
  name: "EmptyState",
  params: { icon: "grid", title: "Nothing here yet" },
  template: {
    type: "Box",
    props: { style: { align: "center", gap: 3, py: 7, px: 4 } },
    children: [
      {
        type: "Box",
        props: { style: { width: 64, height: 64, radius: "pill", bg: "surface-raised", align: "center", justify: "center", color: "text-faint" } },
        children: [{ type: "Icon", props: { name: { $bind: "icon" }, size: 26 } }],
      },
      { type: "Text", props: { text: { $bind: "title" }, style: { variant: "lg", weight: "bold" } } },
      { type: "Text", props: { $if: { $bind: "message" }, text: { $bind: "message" }, style: { color: "text-muted", align: "center" } } },
      { type: "Outlet", props: { name: "action" } },
    ],
  },
};

/** Button — variant selects a full style object via $match; icon is optional. */
const buttonBase = { direction: "row", align: "center", justify: "center", gap: 2, px: 4, py: 3, radius: "md" };
const button: ComponentDefinition = {
  name: "Button",
  params: { variant: "primary", label: "Button" },
  template: {
    type: "Pressable",
    props: {
      action: { $bind: "action" },
      disabled: { $bind: "disabled" },
      style: {
        $match: {
          on: { $bind: "variant" },
          cases: {
            // Acrylic pills (glass → the material class): primary is an
            // accent-tinted, edge-lit pill; secondary a neutral translucent one.
            primary: { ...buttonBase, glass: true, bg: "accent-quiet", color: "text", border: true, borderColor: "accent" },
            secondary: { ...buttonBase, glass: true, bg: "surface-raised", color: "text", border: true, borderColor: "border-strong" },
            ghost: { ...buttonBase, color: "text-muted" },
            danger: { ...buttonBase, glass: true, bg: "danger-quiet", color: "danger", border: true, borderColor: "danger" },
          },
          default: { ...buttonBase, glass: true, bg: "accent-quiet", color: "text", border: true, borderColor: "accent" },
        },
      },
    },
    children: [
      { type: "Icon", props: { $if: { $bind: "icon" }, name: { $bind: "icon" }, size: "1em" } },
      { type: "Text", props: { text: { $bind: "label" }, style: { weight: "medium" } } },
    ],
  },
};

/** IconButton — icon-only Pressable; label becomes the accessible name. */
const iconButton: ComponentDefinition = {
  name: "IconButton",
  params: { icon: "dots", label: "Action", variant: "ghost" },
  template: {
    type: "Pressable",
    props: {
      action: { $bind: "action" },
      label: { $bind: "label" },
      style: {
        $match: {
          on: { $bind: "variant" },
          cases: {
            solid: { width: 38, height: 38, radius: "md", align: "center", justify: "center", bg: "accent", color: "text-on-accent" },
            ghost: { width: 38, height: 38, radius: "md", align: "center", justify: "center", color: "text-muted" },
          },
          default: { width: 38, height: 38, radius: "md", align: "center", justify: "center", color: "text-muted" },
        },
      },
    },
    children: [{ type: "Icon", props: { name: { $bind: "icon" } } }],
  },
};

const tagStyle = { direction: "row", align: "center", bg: "surface-raised", border: true, radius: "pill", px: 3 };
/** GenreTag — a Pressable when it carries an action, a plain Box otherwise. */
const genreTag: ComponentDefinition = {
  name: "GenreTag",
  template: {
    type: "Fragment",
    children: [
      {
        type: "Pressable",
        props: { $if: { $bind: "action" }, action: { $bind: "action" }, style: tagStyle },
        children: [{ type: "Text", props: { text: { $bind: "label" }, style: { variant: "xs", color: "text-muted" } } }],
      },
      {
        type: "Box",
        props: { $ifNot: { $bind: "action" }, style: tagStyle },
        children: [{ type: "Text", props: { text: { $bind: "label" }, style: { variant: "xs", color: "text-muted" } } }],
      },
    ],
  },
};

/** EpisodeRow — a Part under a series: thumb + title/runtime/overview. */
const episodeRow: ComponentDefinition = {
  name: "EpisodeRow",
  template: {
    type: "Pressable",
    props: { action: { $bind: "action" }, style: { direction: "row", align: "start", gap: 4, p: 3, radius: "md" } },
    children: [
      {
        type: "Box",
        props: { style: { width: 148, aspectRatio: "16 / 9", radius: "sm", overflow: "hidden", bg: "surface-raised" } },
        children: [{ type: "Image", props: { src: { $bind: "thumbnail" }, placeholder: " ", style: { width: "full", height: "full" } } }],
      },
      {
        type: "Box",
        props: { style: { grow: true, gap: 1 } },
        children: [
          {
            type: "Box",
            props: { style: { direction: "row", justify: "between", align: "baseline", gap: 3 } },
            children: [
              {
                type: "Box",
                props: { style: { direction: "row", align: "baseline", gap: 2 } },
                children: [
                  { type: "Text", props: { $if: { $bind: "index" }, text: { $bind: "index" }, style: { color: "text-faint", tabular: true } } },
                  { type: "Text", props: { text: { $bind: "title" }, style: { weight: "medium" } } },
                ],
              },
              { type: "Text", props: { $if: { $bind: "runtime" }, text: { $bind: "runtime" }, style: { variant: "sm", color: "text-faint" } } },
            ],
          },
          { type: "Text", props: { $if: { $bind: "overview" }, text: { $bind: "overview" }, style: { variant: "sm", color: "text-muted", lineClamp: 2 } } },
        ],
      },
      { type: "Icon", props: { $if: { $bind: "watched" }, name: "check", color: "success" } },
    ],
  },
};

/** DetailHeader — poster + metadata. Flex-wrap approximates the 2→1 column
 *  collapse; a true responsive breakpoint is a later vocab addition. */
const detailHeader: ComponentDefinition = {
  name: "DetailHeader",
  template: {
    type: "Box",
    props: { style: { direction: "row", gap: 6, wrap: true } },
    children: [
      {
        type: "Box",
        props: { style: { width: 220, aspectRatio: "2 / 3", radius: "md", overflow: "hidden", bg: "surface-raised", shadow: "2" } },
        children: [{ type: "Image", props: { src: { $bind: "poster" }, placeholder: { $bind: "mediaType" }, artLight: "ambient", style: { width: "full", height: "full" } } }],
      },
      {
        type: "Box",
        props: { style: { grow: true, gap: 4, minWidth: "50%" } },
        children: [
          { type: "Text", props: { text: { $bind: "title" }, style: { variant: "2xl", weight: "bold" } } },
          {
            type: "Box",
            props: { style: { direction: "row", align: "center", gap: 3, wrap: true } },
            children: [
              { type: "Text", props: { $if: { $bind: "year" }, text: { $bind: "year" }, style: { variant: "sm", color: "text-muted" } } },
              { type: "Text", props: { $if: { $bind: "mediaType" }, text: { $bind: "mediaType" }, style: { variant: "sm", color: "text-muted", transform: "capitalize" } } },
              {
                type: "Box",
                props: { $if: { $bind: "rating" }, style: { direction: "row", align: "center", gap: 1, color: "rating" } },
                children: [
                  { type: "Icon", props: { name: "star", size: "0.95em" } },
                  { type: "Text", props: { text: { $bind: "rating" }, style: { variant: "sm" } } },
                ],
              },
            ],
          },
          {
            type: "Box",
            props: { style: { direction: "row", gap: 2, wrap: true } },
            children: [
              {
                type: "Box",
                props: { $each: { $bind: "genres" }, $as: "g", style: { bg: "surface-raised", border: true, radius: "pill", px: 3 } },
                children: [{ type: "Text", props: { text: { $bind: "g" }, style: { variant: "xs", color: "text-muted" } } }],
              },
            ],
          },
          { type: "Text", props: { $if: { $bind: "overview" }, text: { $bind: "overview" }, style: { color: "text-muted", maxWidth: "68%" } } },
          {
            type: "Box",
            props: { style: { direction: "row", gap: 3, wrap: true } },
            children: [{ type: "Outlet", props: { name: "actions" } }],
          },
        ],
      },
    ],
  },
};

/** PlaybackBar — resume control + titles + progress. */
const playbackBar: ComponentDefinition = {
  name: "PlaybackBar",
  template: {
    type: "Box",
    props: { style: { direction: "row", align: "center", gap: 4, px: 4, py: 3, radius: "lg", bg: "surface-raised", border: true } },
    children: [
      {
        type: "Pressable",
        props: { action: { $bind: "action" }, label: "Resume", style: { width: 44, height: 44, radius: "pill", align: "center", justify: "center", bgGradient: { from: "accent", to: "info", angle: 122 }, color: "text-on-accent" } },
        children: [{ type: "Icon", props: { name: "play" } }],
      },
      {
        type: "Box",
        props: { style: { grow: true, gap: 2 } },
        children: [
          {
            type: "Box",
            props: { style: { direction: "row", align: "baseline", gap: 3 } },
            children: [
              { type: "Text", props: { text: { $bind: "title" }, style: { weight: "medium" } } },
              { type: "Text", props: { $if: { $bind: "subtitle" }, text: { $bind: "subtitle" }, style: { variant: "sm", color: "text-muted" } } },
            ],
          },
          { type: "ProgressBar", props: { value: { $bind: "progress" } } },
        ],
      },
    ],
  },
};

/** HeroBanner — backdrop layer + gradient scrim + content, from primitives.
 *  Concept-shaped: an optional `kicker` pill, an optional `nativeTitle`, meta as
 *  bordered pills, an optional resume `progress` (0..1) + `progressLabel`, a
 *  `tags` slot (genre pills, shown when `showTags`), an optional `credits` line,
 *  an `aside` slot for a docked panel, and a `rail` slot for a floor filmstrip.
 *
 *  `variant` picks the composition:
 *   - "card"    (default) — a framed 380px rounded banner, content bottom-anchored.
 *   - "feature" — cinematic, viewport-tall, frameless, content lifted to the
 *                 lower third. The home landing hero; place it in a `bleed` slot.
 *   - "detail"  — cinematic, ~tall, frameless, content anchored near the top.
 *                 The detail screen hero; also a `bleed` slot. */
const heroBanner: ComponentDefinition = {
  name: "HeroBanner",
  params: { variant: "card" },
  template: {
    type: "Box",
    props: {
      style: {
        position: "relative",
        overflow: "hidden",
        justify: "end",
        minHeight: { $match: { on: { $bind: "variant" }, cases: { feature: "screen", detail: 620 }, default: 380 } },
        radius: { $match: { on: { $bind: "variant" }, cases: { feature: "", detail: "" }, default: "xl" } },
        border: { $match: { on: { $bind: "variant" }, cases: { feature: false, detail: false }, default: true } },
      },
    },
    children: [
      { type: "Image", props: { src: { $bind: "backdrop" }, placeholder: " ", artLight: "ambient", style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "full", height: "full" } } },
      /* Two scrim layers: a side wash toward the text column and a bottom-up
         wash under it, so copy stays legible over bright artwork in both themes. */
      { type: "Box", props: { style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, bgGradient: { from: "bg", to: "transparent", angle: 70 } } } },
      { type: "Box", props: { style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, bgGradient: { from: "bg", to: "transparent", angle: 0 } } } },
      {
        // Content column: the main row (text + aside) sits above a full-width
        // rail, both anchored to the floor of the banner.
        type: "Box",
        props: {
          style: {
            position: "relative",
            direction: "column",
            gap: 5,
            px: "gutter",
            pt: { $match: { on: { $bind: "variant" }, cases: { detail: 8 }, default: 6 } },
            pb: 7,
            grow: true,
            // detail anchors content near the top; card/feature toward the floor
            // (feature then lifts it back up with the flex spacers below).
            justify: { $match: { on: { $bind: "variant" }, cases: { detail: "start" }, default: "end" } },
          },
        },
        children: [
          // "feature" only: flex spacers lift the text block into the lower third
          // (≈3:2). Other variants get flex:0 (collapsed) so justify governs.
          { type: "Box", props: { style: { flex: { $match: { on: { $bind: "variant" }, cases: { feature: 3 }, default: 0 } } } } },
          {
            type: "Box",
            props: { style: { direction: "row", align: "end", gap: 6, wrap: true } },
            children: [
              {
                type: "Box",
                props: { style: { gap: 4, grow: true, maxWidth: 720, justify: "end" } },
                children: [
                  {
                    type: "Box",
                    props: { $if: { $bind: "kicker" }, style: { direction: "row" } },
                    children: [
                      {
                        type: "Box",
                        props: { style: { direction: "row", align: "center", gap: 2, px: 3, py: 1, radius: "pill", bg: "surface-overlay", glass: true, border: true } },
                        children: [
                          { type: "Box", props: { style: { width: 6, height: 6, radius: "pill", bg: "accent" } } },
                          { type: "Text", props: { text: { $bind: "kicker" }, style: { variant: "xs", weight: "medium", transform: "uppercase", tracking: "wide" } } },
                        ],
                      },
                    ],
                  },
                  /* Title treatment: the clearlogo when the source has one (ADR
                     0034), else the title set as text. Full-bleed uses the
                     oversized display size; framed uses 3xl. */
                  {
                    type: "Box",
                    props: { $if: { $bind: "logo" }, style: { height: 96, maxWidth: 460 } },
                    children: [{ type: "Image", props: { src: { $bind: "logo" }, fit: "contain", placeholder: " ", style: { width: "full", height: "full" } } }],
                  },
                  {
                    type: "Text",
                    props: {
                      $ifNot: { $bind: "logo" },
                      text: { $bind: "title" },
                      style: { variant: { $match: { on: { $bind: "variant" }, cases: { feature: "4xl", detail: "4xl" }, default: "3xl" } }, weight: "bold", tracking: "tight" },
                    },
                  },
                  { type: "Text", props: { $if: { $bind: "nativeTitle" }, text: { $bind: "nativeTitle" }, style: { variant: "lg", color: "text-muted" } } },
                  {
                    type: "Box",
                    props: { $if: { $bind: "meta" }, style: { direction: "row", gap: 2, wrap: true, align: "center" } },
                    children: [
                      {
                        type: "Box",
                        props: { $each: { $bind: "meta" }, $as: "m", style: { bg: "surface-overlay", glass: true, border: true, radius: "pill", px: 3, py: 1 } },
                        children: [{ type: "Text", props: { text: { $bind: "m" }, style: { variant: "xs", color: "text-muted" } } }],
                      },
                    ],
                  },
                  /* Resume progress: a slim bar + a "58 min left" label, shown
                     only when the caller supplies a 0..1 `progress`. */
                  {
                    type: "Box",
                    props: { $if: { $bind: "progress" }, style: { direction: "row", align: "center", gap: 3, maxWidth: 420, pt: 1 } },
                    children: [
                      { type: "Box", props: { style: { grow: true }, }, children: [{ type: "ProgressBar", props: { value: { $bind: "progress" } } }] },
                      { type: "Text", props: { $if: { $bind: "progressLabel" }, text: { $bind: "progressLabel" }, style: { variant: "xs", color: "text-muted" } } },
                    ],
                  },
                  // Genre pills (detail): a horizontal wrap of GenreTags filled
                  // from the "tags" slot, shown only when the caller sets showTags.
                  {
                    type: "Box",
                    props: { $if: { $bind: "showTags" }, style: { direction: "row", wrap: true, gap: 2 } },
                    children: [{ type: "Outlet", props: { name: "tags" } }],
                  },
                  { type: "Text", props: { $if: { $bind: "overview" }, text: { $bind: "overview" }, style: { color: "text-muted", maxWidth: 640 } } },
                  { type: "Text", props: { $if: { $bind: "credits" }, text: { $bind: "credits" }, style: { variant: "sm", color: "text-faint" } } },
                  {
                    type: "Box",
                    props: { style: { direction: "row", gap: 3, wrap: true, pt: 2 } },
                    children: [{ type: "Outlet", props: { name: "actions" } }],
                  },
                ],
              },
              { type: "Outlet", props: { name: "aside" } },
            ],
          },
          { type: "Box", props: { style: { flex: { $match: { on: { $bind: "variant" }, cases: { feature: 2 }, default: 0 } } } } },
          { type: "Outlet", props: { name: "rail" } },
        ],
      },
    ],
  },
};

/** DetailHero — the paneled detail composition: a full-bleed backdrop (the
 *  light source) with the title/meta/genres/overview/actions inside a floating
 *  GLASS acrylic panel, and an `aside` slot for a second glass info panel. The
 *  panels are large glass surfaces, so the acrylic material (pigment, edge light,
 *  caustic, refraction) reads properly. The content row wraps → the panels stack
 *  on a phone. */
const detailHero: ComponentDefinition = {
  name: "DetailHero",
  template: {
    type: "Box",
    props: { style: { position: "relative", overflow: "hidden", minHeight: 660, justify: "end" } },
    children: [
      { type: "Image", props: { src: { $bind: "backdrop" }, placeholder: " ", artLight: "ambient", style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "full", height: "full" } } },
      { type: "Box", props: { style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, bgGradient: { from: "bg", to: "transparent", angle: 70 } } } },
      { type: "Box", props: { style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, bgGradient: { from: "bg", to: "transparent", angle: 0 } } } },
      {
        type: "Box",
        props: { style: { position: "relative", direction: "row", align: "end", gap: 5, px: "gutter", pt: 8, pb: 7, wrap: true, kind: "detail-panels" } },
        children: [
          {
            // The main content PANEL — a large glass acrylic surface.
            type: "Box",
            props: { style: { glass: true, radius: "xl", border: true, p: 6, gap: 4, grow: true, maxWidth: 640, minWidth: 280, justify: "end" } },
            children: [
              {
                type: "Box",
                props: { $if: { $bind: "kicker" }, style: { direction: "row" } },
                children: [
                  {
                    type: "Box",
                    props: { style: { direction: "row", align: "center", gap: 2, px: 3, py: 1, radius: "pill", bg: "surface-overlay", glass: true, border: true } },
                    children: [
                      { type: "Box", props: { style: { width: 6, height: 6, radius: "pill", bg: "accent" } } },
                      { type: "Text", props: { text: { $bind: "kicker" }, style: { variant: "xs", weight: "medium", transform: "uppercase", tracking: "wide" } } },
                    ],
                  },
                ],
              },
              {
                type: "Box",
                props: { $if: { $bind: "logo" }, style: { height: 84, maxWidth: 400 } },
                children: [{ type: "Image", props: { src: { $bind: "logo" }, fit: "contain", placeholder: " ", style: { width: "full", height: "full" } } }],
              },
              { type: "Text", props: { $ifNot: { $bind: "logo" }, text: { $bind: "title" }, style: { variant: "4xl", weight: "bold", tracking: "tight" } } },
              {
                type: "Box",
                props: { $if: { $bind: "meta" }, style: { direction: "row", gap: 2, wrap: true, align: "center" } },
                children: [
                  {
                    type: "Box",
                    props: { $each: { $bind: "meta" }, $as: "m", style: { bg: "surface-overlay", glass: true, border: true, radius: "pill", px: 3, py: 1 } },
                    children: [{ type: "Text", props: { text: { $bind: "m" }, style: { variant: "xs", color: "text-muted" } } }],
                  },
                ],
              },
              {
                type: "Box",
                props: { $if: { $bind: "showTags" }, style: { direction: "row", wrap: true, gap: 2 } },
                children: [{ type: "Outlet", props: { name: "tags" } }],
              },
              { type: "Text", props: { $if: { $bind: "overview" }, text: { $bind: "overview" }, style: { color: "text-muted", lineClamp: 4 } } },
              {
                type: "Box",
                props: { style: { direction: "row", gap: 3, wrap: true, pt: 2 } },
                children: [{ type: "Outlet", props: { name: "actions" } }],
              },
            ],
          },
          { type: "Outlet", props: { name: "aside" } },
        ],
      },
    ],
  },
};

/** MediaTile — a glass-framed media card (the slothui-style showcase tile): a
 *  poster inset in a translucent acrylic frame with a title/subtitle below and an
 *  optional corner badge. Because the whole card is glass, a rail of them lets the
 *  edge light + caustic sweep across the row as they track the hero artwork — the
 *  parallax made visible. Distinct from PosterCard (a plain, opaque poster). */
const mediaTile: ComponentDefinition = {
  name: "MediaTile",
  params: { title: "Untitled" },
  template: {
    type: "Pressable",
    props: { action: { $bind: "action" }, lift: true, style: { glass: true, radius: "lg", border: true, p: 2, gap: 2 } },
    children: [
      {
        type: "Box",
        props: { style: { position: "relative", radius: "md", overflow: "hidden", aspectRatio: "2 / 3", bg: "surface-raised" } },
        children: [
          { type: "Image", props: { src: { $bind: "poster" }, alt: { $bind: "title" }, placeholder: { $bind: "mediaType" }, artLight: "focus", style: { width: "full", height: "full" } } },
          {
            type: "Box",
            props: { $if: { $bind: "badge" }, style: { position: "absolute", top: 1, left: 1, glass: true, bg: "surface-overlay", border: true, radius: "pill", px: 2, py: 1 } },
            children: [{ type: "Text", props: { text: { $bind: "badge" }, style: { variant: "xs", weight: "medium" } } }],
          },
        ],
      },
      {
        type: "Box",
        props: { style: { px: 1, gap: 0 } },
        children: [
          { type: "Text", props: { text: { $bind: "title" }, style: { variant: "sm", weight: "medium", lineClamp: 1 } } },
          { type: "Text", props: { $if: { $bind: "subtitle" }, text: { $bind: "subtitle" }, style: { variant: "xs", color: "text-muted" } } },
        ],
      },
    ],
  },
};

/** InfoPanel — a glass acrylic side panel: a big rating, then label/value rows.
 *  Rows come from the `rows` param ([{label,value}]); the rating is optional. */
const infoPanel: ComponentDefinition = {
  name: "InfoPanel",
  template: {
    type: "Box",
    props: { style: { glass: true, radius: "xl", border: true, p: 5, gap: 4, minWidth: 232, maxWidth: 320, grow: true } },
    children: [
      {
        type: "Box",
        props: { $if: { $bind: "rating" }, style: { direction: "row", align: "center", gap: 2 } },
        children: [
          { type: "Icon", props: { name: "star", color: "rating", size: "1.4em" } },
          { type: "Text", props: { text: { $bind: "rating" }, style: { variant: "2xl", weight: "bold" } } },
          { type: "Text", props: { $if: { $bind: "ratingLabel" }, text: { $bind: "ratingLabel" }, style: { variant: "xs", color: "text-faint" } } },
        ],
      },
      {
        type: "Box",
        props: { style: { gap: 3 } },
        children: [
          {
            type: "Box",
            props: { $each: { $bind: "rows" }, $as: "r", style: { direction: "row", justify: "between", align: "baseline", gap: 4 } },
            children: [
              { type: "Text", props: { text: { $bind: "r.label" }, style: { variant: "sm", color: "text-faint" } } },
              { type: "Text", props: { text: { $bind: "r.value" }, style: { variant: "sm", weight: "medium", align: "end" } } },
            ],
          },
        ],
      },
    ],
  },
};

/** TextField — label + bare TextInput + help. */
const textField: ComponentDefinition = {
  name: "TextField",
  template: {
    type: "Box",
    props: { style: { gap: 2 } },
    children: [
      { type: "Text", props: { $if: { $bind: "label" }, text: { $bind: "label" }, style: { variant: "sm", weight: "medium", color: "text-muted" } } },
      { type: "TextInput", props: { inputType: { $bind: "inputType" }, placeholder: { $bind: "placeholder" }, value: { $bind: "value" } } },
      { type: "Text", props: { $if: { $bind: "help" }, text: { $bind: "help" }, style: { variant: "xs", color: "text-faint" } } },
    ],
  },
};

/** Toggle — bare Switch + label. */
const toggle: ComponentDefinition = {
  name: "Toggle",
  template: {
    type: "Box",
    props: { style: { direction: "row", align: "center", gap: 3 } },
    children: [
      { type: "Switch", props: { value: { $bind: "value" }, action: { $bind: "action" } } },
      { type: "Text", props: { $if: { $bind: "label" }, text: { $bind: "label" }, style: { variant: "sm" } } },
    ],
  },
};

/** Select — label + bare SelectInput. */
const select: ComponentDefinition = {
  name: "Select",
  template: {
    type: "Box",
    props: { style: { gap: 2 } },
    children: [
      { type: "Text", props: { $if: { $bind: "label" }, text: { $bind: "label" }, style: { variant: "sm", weight: "medium", color: "text-muted" } } },
      { type: "SelectInput", props: { options: { $bind: "options" }, value: { $bind: "value" } } },
    ],
  },
};

export const PLATFORM_DEFINITIONS: ComponentDefinition[] = [
  posterCard,
  badge,
  statusIndicator,
  banner,
  personChip,
  sourcePicker,
  emptyState,
  button,
  iconButton,
  genreTag,
  episodeRow,
  detailHeader,
  playbackBar,
  heroBanner,
  detailHero,
  infoPanel,
  mediaTile,
  textField,
  toggle,
  select,
];
