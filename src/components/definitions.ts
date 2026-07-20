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
            shadow: "1",
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
            primary: { ...buttonBase, bgGradient: { from: "accent", to: "info", angle: 122 }, color: "text-on-accent" },
            secondary: { ...buttonBase, bg: "surface-raised", color: "text", border: true, borderColor: "border-strong" },
            ghost: { ...buttonBase, color: "text-muted" },
            danger: { ...buttonBase, bg: "danger-quiet", color: "danger", border: true, borderColor: "danger" },
          },
          default: { ...buttonBase, bg: "accent", color: "text-on-accent" },
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
 *  Concept-shaped: an optional `kicker` pill ("Continue watching"), an optional
 *  `nativeTitle`, meta rendered as bordered pills, and an `aside` slot for a
 *  ratings/info panel docked to the right edge of the card. */
const heroBanner: ComponentDefinition = {
  name: "HeroBanner",
  template: {
    type: "Box",
    props: { style: { position: "relative", radius: "xl", overflow: "hidden", minHeight: 380, justify: "end", border: true } },
    children: [
      { type: "Image", props: { src: { $bind: "backdrop" }, placeholder: " ", artLight: "ambient", style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "full", height: "full" } } },
      /* Two scrim layers: a side wash toward the text column and a bottom-up
         wash under it, so copy stays legible over bright artwork in both themes. */
      { type: "Box", props: { style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, bgGradient: { from: "bg", to: "transparent", angle: 70 } } } },
      { type: "Box", props: { style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, bgGradient: { from: "bg", to: "transparent", angle: 0 } } } },
      {
        type: "Box",
        props: { style: { position: "relative", direction: "row", align: "end", gap: 6, p: 6, grow: true, wrap: true } },
        children: [
          {
            type: "Box",
            props: { style: { gap: 3, grow: true, maxWidth: 620, justify: "end" } },
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
                      { type: "Text", props: { text: { $bind: "kicker" }, style: { variant: "xs", weight: "medium", transform: "uppercase" } } },
                    ],
                  },
                ],
              },
              /* Title treatment: the clearlogo when the source has one (ADR
                 0034), else the title set as text. */
              {
                type: "Box",
                props: { $if: { $bind: "logo" }, style: { height: 96, maxWidth: 460 } },
                children: [{ type: "Image", props: { src: { $bind: "logo" }, fit: "contain", placeholder: " ", style: { width: "full", height: "full" } } }],
              },
              { type: "Text", props: { $ifNot: { $bind: "logo" }, text: { $bind: "title" }, style: { variant: "3xl", weight: "bold" } } },
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
              { type: "Text", props: { $if: { $bind: "overview" }, text: { $bind: "overview" }, style: { color: "text-muted" } } },
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
  textField,
  toggle,
  select,
];
