// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Tabs — a stateful PRIMITIVE, not a component. It owns selection state and
 * shows the matching panel slot, coordination a static template can't express.
 * The former layout components here (Screen/Section/Carousel/Grid/Stack/Divider)
 * are compositions and now live as definitions (components/definitions.layout.ts).
 */

import { useState } from "react";
import type { UINode } from "../sdui/types";
import { prop } from "../sdui/registry";
import { Slot, Children } from "../sdui/Renderer";
import { cx } from "./shared";

/**
 * `props.tabs` is [{id,label}]; each tab's content lives in the slot of the
 * same id. Selection is internal.
 */
export function Tabs({ node }: { node: UINode }) {
  const tabs = prop<Array<{ id: string; label: string }>>(node, "tabs", []);
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div className="msc-tabs">
      <div className="msc-tabs__list" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={cx("msc-tabs__tab", active === t.id && "is-active")}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="msc-tabs__panel" role="tabpanel">
        {active && <Slot node={node} name={active} />}
      </div>
    </div>
  );
}

/**
 * NavBar — the app frame's navigation group. On desktop CSS lays it out inline
 * in the top bar; on mobile it becomes a fixed bottom tab bar (icon-over-label
 * tabs), the native-app pattern (components.css). Stateless — it just wraps the
 * nav items; the breakpoint styling does the rest.
 */
export function NavBar({ node }: { node: UINode }) {
  return (
    <nav className="msc-navbar">
      <Children nodes={node.children} />
    </nav>
  );
}
