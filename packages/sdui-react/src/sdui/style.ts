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

export type SpaceToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type RadiusToken = "sm" | "md" | "lg" | "xl" | "pill";
export type ShadowToken = "1" | "2" | "3";
export type TextVariant = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
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
export type Dimension = number | "full" | "auto" | `${number}%`;
export type GradientStop = ColorToken | "transparent";

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

  /** Horizontal scroll + snap, for carousels. */
  overflowX?: "auto" | "hidden" | "visible";
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
  color?: ColorToken;
  radius?: RadiusToken;
  border?: boolean;
  borderColor?: ColorToken;

  width?: Dimension;
  height?: Dimension;
  minWidth?: Dimension;
  maxWidth?: Dimension;
  minHeight?: Dimension;
  aspectRatio?: string;

  flex?: number;
  grow?: boolean;

  position?: "relative" | "absolute";
  top?: SpaceToken;
  right?: SpaceToken;
  bottom?: SpaceToken;
  left?: SpaceToken;

  overflow?: "hidden" | "auto" | "visible";
  shadow?: ShadowToken;
  opacity?: number;
}

export interface TextStyle {
  variant?: TextVariant;
  weight?: Weight;
  color?: ColorToken;
  align?: "start" | "center" | "end";
  transform?: "uppercase" | "capitalize" | "none";
  italic?: boolean;
  mono?: boolean;
  tabular?: boolean;
  lineClamp?: number;
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

/** Translate a token-based BoxStyle into concrete web CSS. */
export function boxToCss(s: BoxStyle): CSSProperties {
  const css: CSSProperties = { boxSizing: "border-box" };
  if (s.layout === "grid") {
    css.display = "grid";
    if (s.gridMin !== undefined) css.gridTemplateColumns = `repeat(auto-fill, minmax(${s.gridMin}px, 1fr))`;
    if (s.gridFlow) css.gridAutoFlow = s.gridFlow;
    if (s.gridAutoColumns !== undefined) css.gridAutoColumns = `${s.gridAutoColumns}px`;
  } else {
    css.display = "flex";
    css.flexDirection = s.direction === "row" ? "row" : "column";
    if (s.align) css.alignItems = ALIGN[s.align];
    if (s.justify) css.justifyContent = JUSTIFY[s.justify];
    if (s.wrap) css.flexWrap = "wrap";
  }
  if (s.gap !== undefined) css.gap = space(s.gap);
  if (s.overflowX) css.overflowX = s.overflowX;
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
  if (s.color) css.color = color(s.color);
  if (s.radius) css.borderRadius = `var(--radius-${s.radius})`;
  if (s.border) css.border = `1px solid ${color(s.borderColor ?? "border")}`;

  if (s.width !== undefined) css.width = dim(s.width);
  if (s.height !== undefined) css.height = dim(s.height);
  if (s.minWidth !== undefined) css.minWidth = dim(s.minWidth);
  if (s.maxWidth !== undefined) css.maxWidth = dim(s.maxWidth);
  if (s.minHeight !== undefined) css.minHeight = dim(s.minHeight);
  if (s.aspectRatio) css.aspectRatio = s.aspectRatio;

  if (s.flex !== undefined) css.flex = s.flex;
  if (s.grow) css.flexGrow = 1;

  if (s.position) css.position = s.position;
  if (s.top !== undefined) css.top = space(s.top);
  if (s.right !== undefined) css.right = space(s.right);
  if (s.bottom !== undefined) css.bottom = space(s.bottom);
  if (s.left !== undefined) css.left = space(s.left);

  if (s.overflow) css.overflow = s.overflow;
  if (s.shadow) css.boxShadow = `var(--shadow-${s.shadow})`;
  if (s.opacity !== undefined) css.opacity = s.opacity;

  return css;
}

/** Translate a token-based TextStyle into concrete web CSS. */
export function textToCss(s: TextStyle): CSSProperties {
  const css: CSSProperties = {};
  if (s.variant) css.fontSize = `var(--text-${s.variant})`;
  if (s.weight) css.fontWeight = `var(--weight-${s.weight})` as unknown as number;
  if (s.color) css.color = color(s.color);
  if (s.align) css.textAlign = s.align === "start" ? "left" : s.align === "end" ? "right" : "center";
  if (s.transform) css.textTransform = s.transform;
  if (s.italic) css.fontStyle = "italic";
  if (s.mono) css.fontFamily = "var(--font-mono)";
  if (s.tabular) css.fontVariantNumeric = "tabular-nums";
  if (s.lineClamp) {
    css.display = "-webkit-box";
    css.WebkitLineClamp = s.lineClamp;
    css.WebkitBoxOrient = "vertical";
    css.overflow = "hidden";
  }
  return css;
}
