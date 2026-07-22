// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Tabs — a stateful PRIMITIVE, not a component. It owns selection state and
 * shows the matching panel slot, coordination a static template can't express.
 * The former layout components here (Screen/Section/Carousel/Grid/Stack/Divider)
 * are compositions and now live as definitions (components/definitions.layout.ts).
 */

import { useState, useEffect, useRef } from "react";
import type { UINode } from "../sdui/types";
import { prop } from "../sdui/registry";
import { Slot, Children, RenderNode } from "../sdui/Renderer";
import { sampleArtColors, setAmbientArt } from "../sdui/artlight";
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
    <nav className="msc-navbar msc-acrylic">
      <Children nodes={node.children} />
    </nav>
  );
}

// A wall-clock epoch SHARED across every Rotator instance and timer. The active
// index is derived from it (floor(elapsed / step) % n) rather than incremented,
// so duplicate timers — or the transient duplicate component instances dev can
// mount (StrictMode, live-session re-pushes) — all compute the SAME index and
// setActive to the same value (React dedupes) instead of racing each other. A
// manual pick realigns the epoch so the clock continues from the chosen slide.
let rotatorEpoch = 0;

/**
 * Rotator — a stateful PRIMITIVE that cross-fades through its children on a
 * timer, the home's cinematic hero carousel. Like Tabs it owns state (the active
 * index) a static template can't express. It also drives the ambient art-light:
 * whenever the active slide changes it re-samples that slide's backdrop and
 * republishes the colours, so every acrylic surface (the content sheet, the nav
 * pill) recolours to whatever hero is on screen. Pauses on hover; dots jump.
 * `props.interval` is the dwell time in ms.
 */
export function Rotator({ node }: { node: UINode }) {
  const slides = node.children ?? [];
  const interval = prop<number>(node, "interval", 6000);
  const step = Math.max(2000, interval);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Auto-advance by polling the shared clock (>1 slide; hover pauses it). The
  // poll is frequent but cheap — it only re-renders when the derived index
  // actually changes, i.e. once per dwell.
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    if (!rotatorEpoch) rotatorEpoch = performance.now();
    const id = window.setInterval(() => {
      setActive(Math.floor((performance.now() - rotatorEpoch) / step) % slides.length);
    }, 400);
    return () => window.clearInterval(id);
  }, [paused, slides.length, step]);

  // Sync the ambient art-light to the active slide's backdrop. This wins over the
  // per-Image "ambient" publish (all slides mount at once, last-one-wins) because
  // it runs on every active change, including the initial one.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const slide = root.querySelectorAll<HTMLElement>(".msc-rotator__slide")[active];
    const img = slide?.querySelector("img") as HTMLImageElement | null;
    if (!img) return;
    const apply = () => {
      const colors = sampleArtColors(img);
      if (colors) setAmbientArt(colors);
    };
    if (img.complete) apply();
    else {
      img.addEventListener("load", apply, { once: true });
      return () => img.removeEventListener("load", apply);
    }
  }, [active, slides.length]);

  return (
    <div
      className="msc-rotator"
      ref={rootRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          className={cx("msc-rotator__slide", i === active && "is-active")}
          aria-hidden={i !== active}
        >
          <RenderNode node={slide} />
        </div>
      ))}
      {slides.length > 1 && (
        <div className="msc-rotator__dots" role="tablist" aria-label="Featured">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Slide ${i + 1}`}
              className={cx("msc-rotator__dot", i === active && "is-active")}
              onClick={() => {
                rotatorEpoch = performance.now() - i * step;
                setActive(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
