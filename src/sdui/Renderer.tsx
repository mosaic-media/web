// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The recursive renderer. Give it a UINode (or a list) and it walks the tree,
 * resolving each node's `type` through the registry. Components pull their own
 * children by calling <Slot> / <Children> so container components control
 * layout, not the renderer.
 */

import { Fragment } from "react";
import type { UINode } from "./types";
import { resolve } from "./registry";
import { Unknown } from "@/components/feedback/Unknown";

export function RenderNode({ node }: { node: UINode }) {
  const Component = resolve(node.type);
  if (!Component) {
    return <Unknown type={node.type} />;
  }
  return <Component node={node} />;
}

/** Render an ordered list of nodes (a component's `children`). */
export function Children({ nodes }: { nodes?: UINode[] }) {
  if (!nodes?.length) return null;
  return (
    <>
      {nodes.map((child, i) => (
        <Fragment key={child.id ?? i}>
          <RenderNode node={child} />
        </Fragment>
      ))}
    </>
  );
}

/** Render a named slot, which may hold one node or a list. */
export function Slot({ node, name }: { node: UINode; name: string }) {
  const slot = node.slots?.[name];
  if (!slot) return null;
  if (Array.isArray(slot)) return <Children nodes={slot} />;
  return <RenderNode node={slot} />;
}

/** Convenience: does this node have content in a given slot? */
export function hasSlot(node: UINode, name: string): boolean {
  const slot = node.slots?.[name];
  return Array.isArray(slot) ? slot.length > 0 : Boolean(slot);
}
