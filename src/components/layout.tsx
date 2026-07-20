/*
 * Layout primitives. These are the container node types: they know nothing
 * about media, they only arrange children (and named slots). Everything else in
 * a screen nests inside these.
 */

import { useState, type CSSProperties } from "react";
import type { Action, UINode } from "@/sdui/types";
import { prop } from "@/sdui/registry";
import { Children, Slot, hasSlot } from "@/sdui/Renderer";
import { useRuntime } from "@/sdui/context";
import { cx, Icon } from "./shared";

/** Screen — the root of a server-defined page. */
export function Screen({ node }: { node: UINode }) {
  const title = prop<string | undefined>(node, "title", undefined);
  const subtitle = prop<string | undefined>(node, "subtitle", undefined);
  return (
    <div className="msc-screen">
      {(title || hasSlot(node, "header")) && (
        <header className="msc-screen__head">
          <Slot node={node} name="header" />
          {title && <h1 className="msc-screen__title">{title}</h1>}
          {subtitle && <p className="msc-screen__subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="msc-screen__body">
        <Children nodes={node.children} />
      </div>
    </div>
  );
}

/** Section — a titled band with an optional "see all" action. */
export function Section({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const title = prop<string | undefined>(node, "title", undefined);
  const action = prop<Action | undefined>(node, "action", undefined);
  const actionLabel = prop<string>(node, "actionLabel", "See all");
  return (
    <section className="msc-section">
      {(title || action) && (
        <div className="msc-section__head">
          {title && <h2 className="msc-section__title">{title}</h2>}
          {action && (
            <button className="msc-section__action" onClick={() => emit(action)}>
              {actionLabel}
              <Icon name="chevron-right" />
            </button>
          )}
        </div>
      )}
      <Children nodes={node.children} />
    </section>
  );
}

/** Carousel — a horizontal, snap-scrolling rail. The backbone of a media UI. */
export function Carousel({ node }: { node: UINode }) {
  const itemWidth = prop<number>(node, "itemWidth", 168);
  const style = { "--msc-rail-item": `${itemWidth}px` } as CSSProperties;
  return (
    <div className="msc-carousel" style={style}>
      <div className="msc-carousel__track">
        <Children nodes={node.children} />
      </div>
    </div>
  );
}

/** Grid — responsive auto-fill grid of cards. */
export function Grid({ node }: { node: UINode }) {
  const min = prop<number>(node, "minColumnWidth", 172);
  const style = { "--msc-grid-min": `${min}px` } as CSSProperties;
  return (
    <div className="msc-grid" style={style}>
      <Children nodes={node.children} />
    </div>
  );
}

/** Stack — generic flex container driven by spacing tokens. */
export function Stack({ node }: { node: UINode }) {
  const direction = prop<"vertical" | "horizontal">(node, "direction", "vertical");
  const gap = prop<number>(node, "gap", 4);
  const align = prop<CSSProperties["alignItems"]>(node, "align", "stretch");
  const justify = prop<CSSProperties["justifyContent"]>(node, "justify", "flex-start");
  const wrap = prop<boolean>(node, "wrap", false);
  const style: CSSProperties = {
    display: "flex",
    flexDirection: direction === "horizontal" ? "row" : "column",
    gap: `var(--space-${gap})`,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? "wrap" : "nowrap",
  };
  return (
    <div className="msc-stack" style={style}>
      <Children nodes={node.children} />
    </div>
  );
}

/**
 * Tabs — switches between named regions. `props.tabs` is [{id,label}]; each
 * tab's content lives in the slot of the same id.
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

/** Divider — a hair rule, optionally labelled. */
export function Divider({ node }: { node: UINode }) {
  const label = prop<string | undefined>(node, "label", undefined);
  if (label) {
    return (
      <div className="msc-divider msc-divider--labelled" role="separator">
        <span>{label}</span>
      </div>
    );
  }
  return <hr className="msc-divider" />;
}

/** Spacer — explicit vertical space, in scale units. */
export function Spacer({ node }: { node: UINode }) {
  const size = prop<number>(node, "size", 4);
  return <div className="msc-spacer" style={{ height: `var(--space-${size})` }} aria-hidden />;
}
