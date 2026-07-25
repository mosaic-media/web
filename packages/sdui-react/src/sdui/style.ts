// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The primitive style vocabulary — the technology-agnostic seam.
 *
 * Primitives (Box/Text/Image/…) take a CONSTRAINED style object whose values
 * reference design TOKENS, never raw px or hex. This is deliberate: it is the
 * intersection of what a web client (flexbox + CSS variables) and a Flutter
 * client (Row/Column/Container + ThemeData) can both render identically. A
 * module composing from primitives writes this vocabulary once; every client
 * translates it. This file is the web translation (style → CSSProperties); a
 * Flutter client would ship the same schema with a Dart translation.
 *
 * Rule of thumb for what may live here: if it can't render the same on web and
 * Flutter, it doesn't belong. No arbitrary CSS, no z-index tricks, no :hover
 * styling (interaction states are the job of interactive primitives, not
 * free-form Box styling).
 */

import type { CSSProperties } from "react";

// Discrete 4px steps, plus "gutter" — the fluid page margin (clamps with the
// viewport) so padding can be responsive without a breakpoint.
export type SpaceToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | "gutter";
export type RadiusToken = "sm" | "md" | "lg" | "xl" | "pill";
export type ShadowToken = "1" | "2" | "3";
export type TextVariant = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
export type Weight = "regular" | "medium" | "bold";

export type ColorToken =
  | "bg"
  | "surface"
  | "surface-raised"
  | "surface-overlay"
  | "text"
  | "text-muted"
  | "text-faint"
  | "text-on-accent"
  | "accent"
  | "accent-hover"
  | "accent-quiet"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "success-quiet"
  | "warning-quiet"
  | "danger-quiet"
  | "info-quiet"
  | "rating"
  | "border"
  | "border-strong";

export type Align = "start" | "center" | "end" | "stretch" | "baseline";
export type Justify = "start" | "center" | "end" | "between" | "around";
/** `"screen"` is the viewport in the relevant axis (100dvh tall / 100vw wide) —
 *  the one non-parent-relative size, for full-bleed heroes and the app frame. It
 *  is portable: Flutter reads it as MediaQuery.size in that axis. */
export type Dimension = number | "full" | "screen" | "auto" | `${number}%`;
export type GradientStop = ColorToken | "transparent";
/** One column of an explicit grid: fixed px, content-sized, or n shares of what
 *  is left over. */
export type GridTrack = number | "auto" | { fill: number };
/** A named legibility wash over artwork. Named, not a gradient the server
 *  writes: the recipe is a formula each client evaluates over its own tokens. */
export type Scrim = "bottom" | "top" | "leading" | "cinematic";
/** A soft bloom over a surface — from the sampled artwork palette, or the brand
 *  accents when there is no image to sample. */
export type Glow = "art" | "brand";

/** Layout + box styling for the Box primitive. All values are tokens/enums. */
export interface BoxStyle {
  /** Layout mode. "grid" enables the grid-* fields (Flutter: GridView). */
  layout?: "flex" | "grid";
  direction?: "row" | "column";
  gap?: SpaceToken;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;

  /** grid: responsive auto-fill columns of at least this width (px). */
  gridMin?: number;
  /** grid: flow direction — "column" makes a horizontal rail. */
  gridFlow?: "row" | "column";
  /** grid: fixed track size for a rail (px). */
  gridAutoColumns?: number;
  /** grid: an explicit column track list, for the arrangements auto-fill cannot
   *  state — a settings frame's nav/panel/aside, an episode row's fixed
   *  thumbnail beside a fluid title. A track is a pixel width, "auto" (sized to
   *  its content) or `{fill: n}` (n shares of the remainder). Three kinds, not a
   *  grid-template string: these are what flexbox and Flutter both lay out the
   *  same way. */
  gridColumns?: GridTrack[];

  /** Horizontal scroll + snap, for carousels. */
  overflowX?: "auto" | "hidden" | "visible";
  /** Vertical scroll, for a framed scroll region (the app frame's content). */
  overflowY?: "auto" | "hidden" | "visible";
  snap?: "x" | "y";
  snapAlign?: "start" | "center";

  p?: SpaceToken;
  px?: SpaceToken;
  py?: SpaceToken;
  pt?: SpaceToken;
  pr?: SpaceToken;
  pb?: SpaceToken;
  pl?: SpaceToken;

  bg?: ColorToken;
  /** Linear gradient background (Flutter-portable). Overrides `bg` if both set. */
  bgGradient?: { from: GradientStop; to: GradientStop; angle?: number };
  /** Frosted-glass backdrop blur (web: backdrop-filter; Flutter: BackdropFilter).
   *  Pair with a translucent `bg` so what's behind shows through the frost. */
  glass?: boolean;
  /** A named legibility wash over artwork, so text on a backdrop stays readable
   *  whatever the image behind it. "bottom"/"top" fade an edge into the page,
   *  "leading" washes the text side, "cinematic" is both. */
  scrim?: Scrim;
  /** A soft bloom, screen-blended so it lights the artwork rather than tinting
   *  it flat. "art" uses the palette sampled from the focused image; "brand"
   *  the accent pair, for a surface with no artwork to sample. */
  glow?: Glow;
  /** Overlay the material texture (grain + blotch + scuff), so a large flat
   *  surface reads as a material. Decorative: never affects layout or hits. */
  grain?: boolean;
  /** Mark this box as the region whose hover/focus reveals the `hoverReveal`
   *  boxes within it. Stated on the ancestor rather than inferred, because what
   *  is revealed is often not inside what is hovered. */
  hoverGroup?: boolean;
  /** Hide until the nearest `hoverGroup` ancestor is hovered or focused — the
   *  card veil. No pointer means reveal on focus; neither means always shown,
   *  because unreachable detail is the worse failure. */
  hoverReveal?: boolean;
  color?: ColorToken;
  radius?: RadiusToken;
  border?: boolean;
  borderColor?: ColorToken;
  /** Draw `border` on one edge only — a rule under a row, a marker down the
   *  side of the selected item. */
  borderSide?: "top" | "right" | "bottom" | "left";
  /** Border weight: a hairline rule, or a marker heavy enough to read as a
   *  selection. Two steps, not a number. */
  borderWidth?: 1 | 2;

  width?: Dimension;
  height?: Dimension;
  minWidth?: Dimension;
  maxWidth?: Dimension;
  minHeight?: Dimension;
  aspectRatio?: string;

  flex?: number;
  grow?: boolean;

  position?: "relative" | "absolute" | "sticky" | "fixed";
  top?: SpaceToken;
  right?: SpaceToken;
  bottom?: SpaceToken;
  left?: SpaceToken;
  /** Pull this box up over what precedes it, so a content sheet rides over the
   *  bottom of a full-bleed hero. One direction and one token step rather than
   *  negative margins in four: this is the one place two siblings are meant to
   *  intersect, and naming it keeps it from becoming an offset escape hatch. */
  overlap?: SpaceToken;
  /** Stacking order for chrome that overlays content (a sticky/fixed bar, an
   *  overlay). Token-named, not an arbitrary integer — this is portable stack
   *  order (Flutter: paint order in a Stack), not a z-index escape hatch. */
  z?: "raised" | "overlay" | "toast";

  overflow?: "hidden" | "auto" | "visible";
  shadow?: ShadowToken;
  opacity?: number;

  /** A named hook the primitive emits as `data-kind`, for the few responsive
   *  behaviours the token system can't express inline (e.g. panels that sit
   *  side-by-side on desktop but stack full-width on mobile). Not a CSS value —
   *  a targeting handle for a matching rule in components.css.
   *
   *  **Prefer `responsive` below for anything new.** A `kind` needs a matching
   *  rule in this package's stylesheet, which makes a new SCREEN cost a client
   *  release — the thing definitions exist to avoid. */
  kind?: string;

  /** A style override applied below a viewport width — the vocabulary's one
   *  responsive capability, and the reason a layout can adapt as DATA.
   *
   *  It exists because everything else here is viewport-blind: a `kind` hook
   *  plus a media query in components.css was the only way to say "these sit
   *  side by side on a desktop and stack on a phone", and that put a stylesheet
   *  edit — a client release — in the path of every new screen. This says the
   *  same thing in the payload, so a server-delivered definition can be
   *  responsive on its own.
   *
   *  Portable by construction: the override is a plain BoxStyle merged over the
   *  base, so a Flutter client implements it as a LayoutBuilder around the same
   *  data rather than as a second styling language. One breakpoint, not a
   *  cascade — enough for phone-vs-desktop, and deliberately not a media-query
   *  system in a props bag.
   *
   *  The merge is shallow: a field the override does not mention keeps its base
   *  value, and **`null` clears one**. `null` rather than `undefined` because
   *  these travel as JSON, and `JSON.stringify` drops an undefined member — an
   *  override written to remove a background would have arrived saying nothing
   *  at all, and silently. */
  responsive?: { below: number; style: ResponsiveOverride };

  /** Take the box out of the layout entirely (web: display:none; Flutter: not
   *  built). Its purpose is `responsive` — one payload carrying both a desktop
   *  and a phone arrangement, with each viewport dropping the half it does not
   *  use. A server that instead emitted a different tree per device would have
   *  to know the viewport, and it does not. */
  hidden?: boolean;
}

/** A BoxStyle override: every field optional, and `null` meaning "clear the
 *  base's value for this field" (see BoxStyle.responsive). */
export type ResponsiveOverride = { [K in keyof BoxStyle]?: BoxStyle[K] | null };

/** Merge a responsive override over a base style: present fields win, `null`
 *  clears, absent fields inherit. */
export function mergeStyle(base: BoxStyle, override: ResponsiveOverride): BoxStyle {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out as BoxStyle;
}

export interface TextStyle {
  variant?: TextVariant;
  weight?: Weight;
  color?: ColorToken;
  align?: "start" | "center" | "end";
  transform?: "uppercase" | "capitalize" | "none";
  /** Letter-spacing: "tight" for display headings, "wide" for eyebrow/overline. */
  tracking?: "tight" | "normal" | "wide";
  italic?: boolean;
  mono?: boolean;
  tabular?: boolean;
  lineClamp?: number;
  /** A legibility shadow, for text laid directly over artwork with no scrim
   *  beneath it. Boolean: the payload says whether the text is over an image,
   *  and how that is drawn is the client's. */
  shadow?: boolean;
}

const ALIGN: Record<Align, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const JUSTIFY: Record<Justify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};

const color = (c?: ColorToken) => (c ? `var(--color-${c})` : undefined);
const space = (n?: SpaceToken) => (n === undefined ? undefined : n === 0 ? "0" : `var(--space-${n})`);
const dim = (d?: Dimension): string | undefined => {
  if (d === undefined) return undefined;
  if (d === "full") return "100%";
  if (typeof d === "number") return `${d}px`;
  return d; // "auto" | "NN%"
};
// Axis-aware dimension: "screen" resolves to the viewport unit for its axis
// (dvh so mobile browser chrome doesn't clip a full-height frame); everything
// else defers to dim().
const vdim = (d: Dimension | undefined, axis: "w" | "h"): string | undefined =>
  d === "screen" ? (axis === "h" ? "100dvh" : "100vw") : dim(d);

const Z: Record<NonNullable<BoxStyle["z"]>, number> = { raised: 1, overlay: 100, toast: 200 };

/* The scrim recipes: token-derived gradient formulas, one per named wash. They
   live here rather than in the payload for the same reason colours are tokens —
   a scrim written as literal stops would be a second skin the server owns, and
   a re-skin would have to reach every screen that used one.

   "leading" runs at 70° rather than straight across: the copy sits on the lower
   left, and an angled wash covers it without flattening the top-right of the
   frame, where the subject usually is. */
const SCRIM_BOTTOM = `linear-gradient(0deg, var(--color-bg) 2%, rgba(0,0,0,0.55) 26%, transparent 62%)`;
const SCRIM_TOP = `linear-gradient(180deg, var(--color-bg) 2%, rgba(0,0,0,0.5) 24%, transparent 58%)`;
const SCRIM_LEADING = `linear-gradient(70deg, var(--color-bg) 4%, rgba(0,0,0,0.82) 30%, rgba(0,0,0,0.15) 62%, transparent 88%)`;
const SCRIM: Record<Scrim, string> = {
  bottom: SCRIM_BOTTOM,
  top: SCRIM_TOP,
  leading: SCRIM_LEADING,
  cinematic: `${SCRIM_LEADING}, ${SCRIM_BOTTOM}`,
};

/* The glow recipes. "art" reads the palette artlight.ts sampled from the
   focused image, so a hero blooms in its own backdrop's colours; the fallbacks
   mean a client that never sampled anything gets the brand light rather than a
   transparent nothing. Screen-blended (below) so it lights the artwork instead
   of washing it out. */
const GLOW_ART =
  "radial-gradient(58% 70% at 76% 26%, var(--art-glow-1, rgba(var(--accent-rgb), 0.4)), transparent 70%)," +
  "radial-gradient(46% 60% at 12% 82%, var(--art-glow-2, rgba(var(--accent-2-rgb), 0.28)), transparent 72%)";
const GLOW_BRAND =
  "radial-gradient(58% 70% at 76% 26%, rgba(var(--accent-rgb), 0.4), transparent 70%)," +
  "radial-gradient(46% 60% at 12% 82%, rgba(var(--accent-2-rgb), 0.28), transparent 72%)";
const GLOW: Record<Glow, string> = { art: GLOW_ART, brand: GLOW_BRAND };

/** The material texture stack, in the order global.css layers it on the page. */
const GRAIN_IMAGE = "var(--material-scuff), var(--material-blotch), var(--material-grain)";
const GRAIN_SIZE = "var(--material-scuff-size), var(--material-blotch-size), var(--material-grain-size)";

const track = (t: GridTrack): string =>
  typeof t === "number" ? `${t}px` : t === "auto" ? "auto" : `minmax(0, ${t.fill}fr)`;

/** The class names boxToCss asks the Box primitive to add. Returned separately
 *  from the inline style because each needs a rule with a selector — a hover
 *  ancestor, a blend mode on a pseudo-element — that inline CSS cannot express.
 *  Keep in step with the `.msc-scrim` / `.msc-glow` / `.msc-grain` /
 *  `.msc-hover-*` rules in components.css. */
export function boxClasses(s: BoxStyle): string[] {
  const out: string[] = [];
  if (s.scrim) out.push("msc-scrim");
  if (s.glow) out.push("msc-glow");
  if (s.grain) out.push("msc-grain");
  if (s.hoverGroup) out.push("msc-hover-group");
  if (s.hoverReveal) out.push("msc-hover-reveal");
  return out;
}

/** Translate a token-based BoxStyle into concrete web CSS. */
export function boxToCss(s: BoxStyle): CSSProperties {
  const css: CSSProperties = { boxSizing: "border-box" };
  if (s.layout === "grid") {
    css.display = "grid";
    if (s.gridMin !== undefined) css.gridTemplateColumns = `repeat(auto-fill, minmax(${s.gridMin}px, 1fr))`;
    // An explicit track list wins over auto-fill: it is the more specific
    // statement, and a payload carrying both means the tracks.
    if (s.gridColumns?.length) css.gridTemplateColumns = s.gridColumns.map(track).join(" ");
    if (s.gridFlow) css.gridAutoFlow = s.gridFlow;
    if (s.gridAutoColumns !== undefined) css.gridAutoColumns = `${s.gridAutoColumns}px`;
    if (s.align) css.alignItems = ALIGN[s.align];
    if (s.justify) css.justifyContent = JUSTIFY[s.justify];
  } else {
    css.display = "flex";
    css.flexDirection = s.direction === "row" ? "row" : "column";
    if (s.align) css.alignItems = ALIGN[s.align];
    if (s.justify) css.justifyContent = JUSTIFY[s.justify];
    if (s.wrap) css.flexWrap = "wrap";
  }
  if (s.gap !== undefined) css.gap = space(s.gap);
  if (s.overflowX) css.overflowX = s.overflowX;
  if (s.overflowY) css.overflowY = s.overflowY;
  if (s.snap) css.scrollSnapType = `${s.snap} proximity`;
  if (s.snapAlign) css.scrollSnapAlign = s.snapAlign;

  if (s.p !== undefined) css.padding = space(s.p);
  if (s.px !== undefined) {
    css.paddingLeft = space(s.px);
    css.paddingRight = space(s.px);
  }
  if (s.py !== undefined) {
    css.paddingTop = space(s.py);
    css.paddingBottom = space(s.py);
  }
  if (s.pt !== undefined) css.paddingTop = space(s.pt);
  if (s.pr !== undefined) css.paddingRight = space(s.pr);
  if (s.pb !== undefined) css.paddingBottom = space(s.pb);
  if (s.pl !== undefined) css.paddingLeft = space(s.pl);

  if (s.bg) css.background = color(s.bg);
  if (s.bgGradient) {
    const stop = (c: GradientStop) => (c === "transparent" ? "transparent" : `var(--color-${c})`);
    css.background = `linear-gradient(${s.bgGradient.angle ?? 180}deg, ${stop(s.bgGradient.from)}, ${stop(s.bgGradient.to)})`;
  }
  if (s.glass) {
    // Layer 1 of the acrylic model (MDS): background DISTORTION — the material
    // bends what is behind it, not merely frosts it. url(#msc-refract) is an SVG
    // feDisplacementMap (injected by acrylic.ts) that ripples the backdrop like
    // real acrylic; the light blur + saturate soften and pigment it. The heavy
    // solid `bg` token is replaced with a translucent tint so the bent artwork
    // shows THROUGH the surface. Layers 2–4 ride the .msc-acrylic class.
    css.backdropFilter = "url(#msc-refract) blur(1.5px) saturate(1.5) brightness(1.04)";
    // Safari lacks reliable url() backdrop filters — degrade to blur there.
    css.WebkitBackdropFilter = "blur(10px) saturate(1.5)";
    // Replace an opaque neutral fill with the translucent tint so the refracted
    // art shows through — but preserve an accent/tinted fill (e.g. an acrylic
    // accent button) so its colour survives.
    const neutralBg = s.bg === "surface" || s.bg === "surface-raised" || s.bg === "surface-overlay";
    if ((neutralBg || !s.bg) && !s.bgGradient) css.background = "var(--acrylic-tint)";
  }
  // The scrim paints as this box's own background, so a definition states it on
  // the overlay Box it already had rather than needing a second node. It wins
  // over bg/bgGradient: a box carrying both meant the wash.
  if (s.scrim) css.background = SCRIM[s.scrim];
  // The glow rides `backgroundImage` and screen-blends via .msc-glow, so it can
  // sit on the same box as a scrim without either one replacing the other.
  if (s.glow) css.backgroundImage = GLOW[s.glow];
  if (s.grain) {
    css.backgroundImage = GRAIN_IMAGE;
    css.backgroundSize = GRAIN_SIZE;
  }
  if (s.color) css.color = color(s.color);
  if (s.radius) css.borderRadius = `var(--radius-${s.radius})`;
  if (s.border) {
    const rule = `${s.borderWidth ?? 1}px solid ${color(s.borderColor ?? "border")}`;
    if (s.borderSide) {
      // One edge only. Written as the long-hand rather than `border` + three
      // resets so it composes with a radius without squaring the other corners.
      if (s.borderSide === "top") css.borderTop = rule;
      else if (s.borderSide === "right") css.borderRight = rule;
      else if (s.borderSide === "bottom") css.borderBottom = rule;
      else css.borderLeft = rule;
    } else {
      css.border = rule;
    }
  }

  if (s.width !== undefined) css.width = vdim(s.width, "w");
  if (s.height !== undefined) css.height = vdim(s.height, "h");
  if (s.minWidth !== undefined) css.minWidth = vdim(s.minWidth, "w");
  if (s.maxWidth !== undefined) css.maxWidth = vdim(s.maxWidth, "w");
  if (s.minHeight !== undefined) css.minHeight = vdim(s.minHeight, "h");
  if (s.aspectRatio) css.aspectRatio = s.aspectRatio;

  if (s.flex !== undefined) css.flex = s.flex;
  if (s.grow) css.flexGrow = 1;

  if (s.position) css.position = s.position;
  if (s.top !== undefined) css.top = space(s.top);
  if (s.right !== undefined) css.right = space(s.right);
  if (s.bottom !== undefined) css.bottom = space(s.bottom);
  if (s.left !== undefined) css.left = space(s.left);
  // A negative top margin rather than a transform: the sheet must actually
  // occupy the shortened space, or the page would scroll as if the overlap
  // were not there.
  if (s.overlap !== undefined) css.marginTop = `calc(-1 * ${space(s.overlap)})`;
  if (s.z) css.zIndex = Z[s.z];

  if (s.overflow) css.overflow = s.overflow;
  if (s.shadow) css.boxShadow = `var(--shadow-${s.shadow})`;
  if (s.opacity !== undefined) css.opacity = s.opacity;
  // Last, so it beats the display the layout mode set above.
  if (s.hidden) css.display = "none";

  return css;
}

/** Translate a token-based TextStyle into concrete web CSS. */
const DISPLAY_VARIANTS = new Set<TextVariant>(["2xl", "3xl", "4xl"]);

export function textToCss(s: TextStyle): CSSProperties {
  const css: CSSProperties = {};
  if (s.variant) {
    css.fontSize = `var(--text-${s.variant})`;
    // Display sizes get tight leading so multi-line headings don't gap open;
    // body sizes inherit the comfortable body line-height.
    if (DISPLAY_VARIANTS.has(s.variant)) css.lineHeight = "var(--leading-tight)";
  }
  if (s.tracking) css.letterSpacing = `var(--tracking-${s.tracking})`;
  if (s.weight) css.fontWeight = `var(--weight-${s.weight})` as unknown as number;
  if (s.color) css.color = color(s.color);
  if (s.align) css.textAlign = s.align === "start" ? "left" : s.align === "end" ? "right" : "center";
  if (s.transform) css.textTransform = s.transform;
  if (s.italic) css.fontStyle = "italic";
  if (s.mono) css.fontFamily = "var(--font-mono)";
  if (s.tabular) css.fontVariantNumeric = "tabular-nums";
  if (s.shadow) css.textShadow = "0 1px 8px rgba(0, 0, 0, 0.8)";
  if (s.lineClamp) {
    css.display = "-webkit-box";
    css.WebkitLineClamp = s.lineClamp;
    css.WebkitBoxOrient = "vertical";
    css.overflow = "hidden";
  }
  return css;
}
