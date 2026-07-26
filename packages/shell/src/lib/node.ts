// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The one conversion between the wire's UINode and the runtime's.
 *
 * It lived inside the live session until the pre-session bootstrap (ADR 0101)
 * needed it too: the doorway arrives on AuthService rather than on the push
 * lane, and it is the same tree in the same encoding. Two copies of this would
 * be two places to get slots wrong.
 */

import type { UINode } from "@mosaic-media/sdui-react";
import type { NodeList, UINode as WireNode } from "@mosaic-media/sdui/sdui-pb";

/** Converts the wire protobuf UINode into the runtime's structural UINode,
 *  unwrapping each slot's NodeList (protobuf maps cannot hold `repeated`, so
 *  slots is map<string, NodeList> on the wire — ADR 0044). props already arrives
 *  as a plain object (google.protobuf.Struct). */
export function toStructural(n: WireNode): UINode {
  const out: UINode = { type: n.type };
  if (n.id) out.id = n.id;
  if (n.props) out.props = n.props as Record<string, unknown>;
  if (n.children.length > 0) out.children = n.children.map(toStructural);
  const slotKeys = Object.keys(n.slots);
  if (slotKeys.length > 0) {
    const slots: Record<string, UINode[]> = {};
    for (const key of slotKeys) {
      slots[key] = (n.slots[key] as NodeList).nodes.map(toStructural);
    }
    out.slots = slots;
  }
  return out;
}
