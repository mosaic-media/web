// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The application frame, server-emitted (ADR 0031). The Shell app owns no
 * layout — it renders whatever AppShell the Platform pushes. These are
 * structural primitives (like Box/Outlet): a named-slot frame the token style
 * system does not express, reusing the chrome CSS in styles/components.css.
 */

import { prop } from "../sdui/registry";
import type { Action, UINode } from "../sdui/types";
import { Slot, hasSlot } from "../sdui/Renderer";
import { useRuntime } from "../sdui/context";
import { Icon, type IconName } from "./shared";

/** AppShell — the frame: a sidebar (brand, a "nav" slot, an optional "foot"
 *  slot), a "topbar" slot, and a "content" region the current screen fills. */
export function AppShell({ node }: { node: UINode }) {
  const title = prop<string>(node, "title", "Mosaic");
  return (
    <div className="msc-app">
      <aside className="msc-sidebar">
        <div className="msc-sidebar__brand">
          <span className="msc-sidebar__name">{title}</span>
        </div>
        <nav className="msc-sidebar__nav">
          <Slot node={node} name="nav" />
        </nav>
        {hasSlot(node, "foot") && (
          <div className="msc-sidebar__foot">
            <Slot node={node} name="foot" />
          </div>
        )}
      </aside>
      <div className="msc-main">
        <header className="msc-topbar">
          <Slot node={node} name="topbar" />
        </header>
        <main className="msc-content">
          <Slot node={node} name="content" />
        </main>
      </div>
    </div>
  );
}

/** NavItem — a sidebar navigation button. It emits its action and highlights
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
