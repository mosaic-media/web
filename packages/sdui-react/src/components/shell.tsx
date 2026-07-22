// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * NavItem — the one stateful leaf of the server-emitted app frame (ADR 0031).
 * The frame itself is now a primitive-tree definition (definitions.layout's
 * AppShell), so its shape is data the Platform owns. NavItem stays native
 * because it reads the runtime's current screen to highlight the active route —
 * state a static template can't express.
 */

import { prop } from "../sdui/registry";
import type { Action, UINode } from "../sdui/types";
import { useRuntime } from "../sdui/context";
import { Icon, type IconName } from "./shared";

/** NavItem — a navigation button. It emits its action and highlights
 *  when the runtime's current screen matches its target. */
export function NavItem({ node }: { node: UINode }) {
  const label = prop<string>(node, "label", "");
  const icon = prop<IconName>(node, "icon", "info");
  const target = prop<string | undefined>(node, "screen", undefined);
  const action = prop<Action | undefined>(node, "action", undefined);
  const { emit, screen } = useRuntime();
  const active = target !== undefined && screen === target;
  return (
    <button
      className={`msc-navitem${active ? " is-active" : ""}`}
      onClick={() => {
        if (action) emit(action);
      }}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}
