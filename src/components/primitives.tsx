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

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Action, UINode } from "../sdui/types";
import { prop } from "../sdui/registry";
import { Children } from "../sdui/Renderer";
import { useRuntime } from "../sdui/context";
import { boxToCss, textToCss, type BoxStyle, type ColorToken, type SpaceToken, type TextStyle } from "../sdui/style";
import { sampleArtColors, setAmbientArt, focusArt, releaseArt, clearAmbientArt, type Rgb } from "../sdui/artlight";
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

/** Image — falls back to a typed placeholder when `src` is absent.
 *
 *  Opt-in `artLight` makes the image a source for the ambient "refraction"
 *  wash (sdui/artlight.ts): "ambient" installs its palette as the screen's
 *  standing light (the hero backdrop); "focus" lends its palette while hovered
 *  (a poster), reverting on leave. Sampling is web-only and best-effort — if the
 *  canvas is unreadable it does nothing and the fallback duo stays. */
export function Image({ node }: { node: UINode }) {
  const src = prop<string | undefined>(node, "src", undefined);
  const alt = prop<string>(node, "alt", "");
  const fit = prop<"cover" | "contain">(node, "fit", "cover");
  const placeholder = prop<string | undefined>(node, "placeholder", undefined);
  const placeholderMode = prop<"label" | "initials">(node, "placeholderMode", "label");
  const artLight = prop<"ambient" | "focus" | undefined>(node, "artLight", undefined);
  const style = prop<BoxStyle>(node, "style", {});
  const css = boxToCss(style);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const palette = useRef<Rgb[] | null>(null);
  // artLight needs a CORS-anonymous request so the canvas is readable, but a CDN
  // that sends no CORS headers then fails the request and the image never shows.
  // On such a failure we retry once without crossOrigin: the image displays, and
  // only its ambient sampling is lost.
  const [corsBlocked, setCorsBlocked] = useState(false);

  const sample = () => {
    const el = imgRef.current;
    if (!el || !el.complete || el.naturalWidth === 0) return null;
    if (!palette.current) palette.current = sampleArtColors(el);
    return palette.current;
  };

  // The ambient source owns the standing light for as long as it's mounted.
  useEffect(() => {
    if (artLight !== "ambient") return;
    const el = imgRef.current;
    if (el?.complete) setAmbientArt(sample());
    return () => clearAmbientArt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artLight, src]);

  if (!src) {
    // "label" shows a truncated type label (poster placeholders); "initials"
    // condenses a name to 1–2 letters (avatar-sized placeholders).
    const text =
      placeholder === undefined
        ? undefined
        : placeholderMode === "initials"
          ? placeholder
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
          : placeholder.slice(0, 14);
    return (
      <div className="msc-prim-placeholder" style={{ ...css, alignItems: "center", justifyContent: "center" }}>
        {text && <span>{text}</span>}
      </div>
    );
  }

  const useCors = artLight !== undefined && !corsBlocked;
  const artProps = artLight
    ? {
        ...(useCors ? { crossOrigin: "anonymous" as const } : {}),
        onLoad: () => {
          palette.current = null;
          if (artLight === "ambient") setAmbientArt(sample());
        },
        // A CORS-less CDN fails the anonymous request; drop crossOrigin and let
        // the image load plainly (sampling is skipped for it).
        onError: useCors ? () => setCorsBlocked(true) : undefined,
        ...(artLight === "focus"
          ? {
              onMouseEnter: () => {
                const c = sample();
                if (c) focusArt(c);
              },
              onMouseLeave: () => releaseArt(),
            }
          : {}),
      }
    : {};

  return (
    <img
      // Remount when falling back so the browser re-fetches without crossOrigin.
      key={useCors ? "cors" : "plain"}
      ref={imgRef}
      src={src}
      alt={alt}
      loading={artLight === "ambient" ? "eager" : "lazy"}
      style={{ ...css, display: "block", objectFit: fit }}
      {...artProps}
    />
  );
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
  const label = prop<string | undefined>(node, "label", undefined);
  return (
    <button
      className={cx("msc-pressable", lift && "msc-pressable--lift")}
      style={boxToCss(style)}
      disabled={disabled}
      aria-label={label}
      title={label}
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
