// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Lifecycle triggers: onAppear and onDisappear (ADR 0090).
 *
 * A node can now say what to do when it is *seen*, and the server decides what
 * that means because the server wrote the action. This client fires what it was
 * handed and reports nothing it was not asked to — which is why no
 * client-to-server telemetry lane was needed. The invoke lane already exists and
 * the server controls what travels on it.
 *
 * "Seen" is a real measurement, not a mount. A rail of forty cards mounts all
 * forty; two of them are on screen. Attributing an impression to a card that
 * rendered off-screen is worse than attributing none, because it looks like
 * data.
 */

import { useEffect, useRef, type RefObject } from "react";
import type { Action } from "./types.js";

/**
 * The fraction of a node that must be on screen before it counts as seen.
 *
 * Any threshold is arbitrary; what matters is that it is *stated* and the same
 * everywhere, so two clients measuring the same screen agree. Half is the
 * common convention and is defensible: a card half on screen has been seen by
 * any reasonable reading, and one a pixel over the edge has not.
 */
export const VISIBILITY_THRESHOLD = 0.5;

/**
 * Fire onAppear once when the node first becomes visible, and onDisappear when
 * it leaves having been visible.
 *
 * Once, not once per scroll: a user scrolling a rail back and forth has seen the
 * card once, and a counter that says eleven is not measuring attention, it is
 * measuring scrolling. onDisappear is symmetric — it fires on the leave that
 * follows a real appearance, so a node that was never seen never reports
 * leaving.
 */
export function useLifecycle(
  ref: RefObject<Element | null>,
  onAppear: Action | undefined,
  onDisappear: Action | undefined,
  emit: (action?: Action) => void,
): void {
  // Held in refs so a re-render with an identical action does not re-observe;
  // the server re-sends the same tree constantly and observing on every push
  // would fire an appearance per push.
  const appear = useRef(onAppear);
  const disappear = useRef(onDisappear);
  const emitRef = useRef(emit);
  appear.current = onAppear;
  disappear.current = onDisappear;
  emitRef.current = emit;

  const seen = useRef(false);

  useEffect(() => {
    // The wrapper is display:contents so it takes part in no layout — a node
    // that reports its own visibility must not be laid out differently from one
    // that does not. But display:contents generates *no box*, so it cannot be
    // observed: an observer pointed at it reports nothing, forever, silently.
    // What is observed is therefore the child it wraps, which is the element
    // actually on screen.
    const el = ref.current?.firstElementChild ?? ref.current;
    if (!el) return;
    if (!appear.current && !disappear.current) return;
    // No IntersectionObserver means no measurement, and no measurement must
    // mean no report — firing on mount instead would produce impressions for
    // things nobody saw, which is worse than a gap because it looks like data.
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= VISIBILITY_THRESHOLD) {
            if (!seen.current) {
              seen.current = true;
              emitRef.current(appear.current);
            }
          } else if (seen.current && disappear.current) {
            emitRef.current(disappear.current);
          }
        }
      },
      { threshold: [VISIBILITY_THRESHOLD] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}
