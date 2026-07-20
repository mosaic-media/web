// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The primitive layer — the irreducible building blocks from which every
 * presentational component (and every module-defined component) is composed.
 * They take the token-based style vocabulary from sdui/style.ts and nothing
 * else, so the same node tree renders on any client.
 *
 * Box / Text / Image / Icon / Spacer are pure presentation. Pressable is the
 * one interactive primitive here: it carries an Action and a built-in hover
 * affordance, because interaction feedback (not arbitrary :hover styling) is a
 * primitive's job. Fragment / Outlet exist for the template mechanism.
 */

import type { CSSProperties } from "react";
import type { Action, UINode } from "@/sdui/types";
import { prop } from "@/sdui/registry";
import { Children } from "@/sdui/Renderer";
import { useRuntime } from "@/sdui/context";
import { boxToCss, textToCss, type BoxStyle, type ColorToken, type SpaceToken, type TextStyle } from "@/sdui/style";
import { cx, Icon, type IconName } from "./shared";

/** Box — the workhorse container: flex layout + token box styling. */
export function Box({ node }: { node: UINode }) {
  const style = prop<BoxStyle>(node, "style", {});
  return (
    <div style={boxToCss(style)}>
      <Children nodes={node.children} />
    </div>
  );
}

/** Text — a run of type. `text` is the string; children allow inline nesting. */
export function Text({ node }: { node: UINode }) {
  const value = prop<string>(node, "text", "");
  const style = prop<TextStyle>(node, "style", {});
  return (
    <span style={textToCss(style)}>
      {value}
      {node.children ? <Children nodes={node.children} /> : null}
    </span>
  );
}

/** Image — falls back to a typed placeholder when `src` is absent. */
export function Image({ node }: { node: UINode }) {
  const src = prop<string | undefined>(node, "src", undefined);
  const alt = prop<string>(node, "alt", "");
  const fit = prop<"cover" | "contain">(node, "fit", "cover");
  const placeholder = prop<string | undefined>(node, "placeholder", undefined);
  const style = prop<BoxStyle>(node, "style", {});
  const css = boxToCss(style);
  if (!src) {
    return (
      <div className="msc-prim-placeholder" style={{ ...css, alignItems: "center", justifyContent: "center" }}>
        {placeholder && <span>{placeholder.slice(0, 14)}</span>}
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" style={{ ...css, display: "block", objectFit: fit }} />;
}

/** Icon — a glyph from the built-in set, tokenised colour + size. */
export function IconPrimitive({ node }: { node: UINode }) {
  const name = prop<IconName>(node, "name", "info");
  const size = prop<number | string>(node, "size", "1.2em");
  const colorToken = prop<ColorToken | undefined>(node, "color", undefined);
  const style: CSSProperties | undefined = colorToken ? { color: `var(--color-${colorToken})` } : undefined;
  return <Icon name={name} size={size} style={style} />;
}

/** Pressable — the interactive primitive: wraps children, emits an Action. */
export function Pressable({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const style = prop<BoxStyle>(node, "style", {});
  const action = prop<Action | undefined>(node, "action", undefined);
  const disabled = prop<boolean>(node, "disabled", false);
  const lift = prop<boolean>(node, "lift", false);
  return (
    <button
      className={cx("msc-pressable", lift && "msc-pressable--lift")}
      style={boxToCss(style)}
      disabled={disabled}
      onClick={() => emit(action)}
    >
      <Children nodes={node.children} />
    </button>
  );
}

/** Spacer — fixed (token) or flexible gap. */
export function Spacer({ node }: { node: UINode }) {
  const size = prop<SpaceToken | undefined>(node, "size", undefined);
  const grow = prop<boolean>(node, "grow", false);
  const style: CSSProperties = {};
  if (grow) style.flex = 1;
  if (size !== undefined) {
    style.width = size === 0 ? "0" : `var(--space-${size})`;
    style.height = size === 0 ? "0" : `var(--space-${size})`;
  }
  return <div style={style} aria-hidden />;
}

/** Fragment — renders children with no wrapper element. */
export function Fragment({ node }: { node: UINode }) {
  return <Children nodes={node.children} />;
}

/**
 * Outlet — inside a component-definition template, a placeholder for the
 * children (or a named slot) the caller passed. The template expander replaces
 * it; if one is ever rendered outside expansion it degrades to its own
 * children.
 */
export function Outlet({ node }: { node: UINode }) {
  return <Children nodes={node.children} />;
}
