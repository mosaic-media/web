// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Skeleton — a PRIMITIVE. Its shimmer is a keyframe animation, outside the
 * static style vocabulary, so it stays native. ErrorState (category→tone/title)
 * is now a $match definition; Badge/Banner/StatusIndicator/EmptyState too.
 */

import type { UINode } from "../sdui/types";
import { prop } from "../sdui/registry";
import { cx } from "./shared";

/** Skeleton — shimmer placeholder. `shape` picks a preset silhouette. */
export function Skeleton({ node }: { node: UINode }) {
  const shape = prop<"poster" | "line" | "block" | "circle">(node, "shape", "block");
  const count = prop<number>(node, "count", 1);
  return (
    <div className={cx("msc-skeleton-group", shape === "poster" && "msc-skeleton-group--rail")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cx("msc-skeleton", `msc-skeleton--${shape}`)} />
      ))}
    </div>
  );
}
