// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Small cross-component helpers: a classnames joiner, the action-emit hook, and
 * a compact inline SVG icon set (no external icon font — the Shell ships zero
 * runtime asset dependencies). Icons inherit `currentColor` and size to 1em.
 */

import type { CSSProperties } from "react";
import type { Action } from "@/sdui/types";
import { useRuntime } from "@/sdui/context";
import { prop } from "@/sdui/registry";
import type { UINode } from "@/sdui/types";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Read an optional `action` prop off a node and return a click handler. */
export function useNodeAction(node: UINode): () => void {
  const { emit } = useRuntime();
  const action = prop<Action | undefined>(node, "action", undefined);
  return () => emit(action);
}

export type IconName =
  | "play"
  | "search"
  | "chevron-right"
  | "chevron-down"
  | "star"
  | "plus"
  | "check"
  | "close"
  | "dots"
  | "info"
  | "warning"
  | "error"
  | "success"
  | "external"
  | "grid"
  | "list";

const PATHS: Record<IconName, string> = {
  play: "M8 5v14l11-7z",
  search: "M10 4a6 6 0 104.9 9.5l4.3 4.3 1.4-1.4-4.3-4.3A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z",
  "chevron-right": "M9 6l6 6-6 6",
  "chevron-down": "M6 9l6 6 6-6",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z",
  plus: "M12 5v14M5 12h14",
  check: "M5 13l4 4L19 7",
  close: "M6 6l12 12M18 6L6 18",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  info: "M12 8h.01M11 12h1v4h1M12 3a9 9 0 100 18 9 9 0 000-18z",
  warning: "M12 3l9 16H3zM12 10v4M12 17h.01",
  error: "M12 3a9 9 0 100 18 9 9 0 000-18zM9 9l6 6M15 9l-6 6",
  success: "M12 3a9 9 0 100 18 9 9 0 000-18zM8 12l3 3 5-5",
  external: "M14 5h5v5M19 5l-8 8M12 5H6a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1v-6",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
};

const FILLED: Partial<Record<IconName, boolean>> = { play: true, star: true };

export function Icon({
  name,
  size = "1em",
  style,
  className,
}: {
  name: IconName;
  size?: number | string;
  style?: CSSProperties;
  className?: string;
}) {
  const filled = FILLED[name];
  return (
    <svg
      className={cx("msc-icon", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
