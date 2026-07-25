// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

import { useCallback, useEffect, useRef } from "react";
import { nearestInDirection, applyRoving, type FocusDirection } from "./focus.js";

const KEYS: Record<string, FocusDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * Wire one node's focus behaviour from the contract's props (ADR 0092).
 *
 * A node that is not focusable and declares no group gets nothing — no
 * attribute, no listener, no cost. That is most nodes, and it is why this can be
 * called unconditionally from the renderer.
 */
export function useFocusBehaviour(
  wrapper: { current: HTMLElement | null },
  props: Record<string, unknown> | undefined,
): void {
  // The element wired is the wrapper's child, resolved *inside* each effect.
  //
  // Resolving it during render instead reads the ref before React has attached
  // it, so every effect sees null on the first pass and never re-runs — the
  // hook compiles, the build is green, and nothing is ever focusable. That is
  // the same silent no-op the display:contents observer was, arrived at a
  // different way, and only the browser found either of them.
  const host = () => (wrapper.current?.firstElementChild as HTMLElement | null) ?? null;
  const focusable = props?.focusable === true;
  const isGroup = props?.focusGroup === true;
  const initial = props?.initialFocus === true;
  const nextFocus = (props?.nextFocus ?? undefined) as Record<string, string> | undefined;

  const nextRef = useRef(nextFocus);
  nextRef.current = nextFocus;

  // Mark the element so the geometry can find it. An attribute rather than a
  // registry, because the geometry is about where things are on screen and the
  // DOM is the only thing that knows.
  useEffect(() => {
    const el = host();
    if (!el) return;
    if (focusable) {
      el.setAttribute("data-focusable", "true");
      // Inside a group the roving pass owns tabIndex; outside one, a focusable
      // node is a tab stop of its own.
      if (!el.closest("[data-focus-group='true']")) el.tabIndex = 0;
    } else {
      el.removeAttribute("data-focusable");
    }
    if (isGroup) el.setAttribute("data-focus-group", "true");
    return () => {
      el.removeAttribute("data-focusable");
      el.removeAttribute("data-focus-group");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper, focusable, isGroup]);

  // At most one initial focus wins, and it is the first to ask. A screen naming
  // two is stating a preference it does not have, and moving focus twice on
  // arrival is worse than honouring either one.
  useEffect(() => {
    if (!initial) return;
    const el = host();
    if (!el) return;
    if (document.querySelector("[data-initial-focus-taken='true']")) return;
    el.setAttribute("data-initial-focus-taken", "true");
    el.focus({ preventScroll: false });
    return () => el.removeAttribute("data-initial-focus-taken");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper, initial]);

  // Roving within a group: one member tabbable, the rest reachable by direction.
  useEffect(() => {
    const el = host();
    if (!el || !isGroup) return;
    applyRoving(el, el.querySelector("[data-focusable='true']"));
    const onFocusIn = (e: FocusEvent) => applyRoving(el, e.target as Element);
    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper, isGroup]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const direction = KEYS[e.key];
      if (!direction) return;
      const el = host();
      if (!el || document.activeElement !== el) return;

      // The contract's override wins over the geometry — that is what it is
      // for, and the cases it exists for are exactly the ones where the nearest
      // node is not the right one.
      const target = nextRef.current?.[direction];
      if (target) {
        // Resolve to the *focusable* element, not to the wrapper that carries
        // the node id. The wrapper is display:contents and cannot take focus, so
        // focusing it is a no-op that leaves the viewer exactly where they were
        // — the dead end this override exists to prevent, produced by the
        // override itself.
        const wrap = document.querySelector(`[data-node-id="${CSS.escape(target)}"]`);
        const dest =
          wrap?.matches("[data-focusable='true']") === true
            ? wrap
            : (wrap?.querySelector("[data-focusable='true']") ?? null);
        if (dest instanceof HTMLElement) {
          e.preventDefault();
          dest.focus();
          return;
        }
        // An override naming a node that is not on screen falls through to the
        // geometry rather than trapping focus. A dead end on a remote is the one
        // outcome with no way out of it.
      }
      const near = nearestInDirection(el, direction);
      if (near instanceof HTMLElement) {
        e.preventDefault();
        near.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wrapper],
  );

  useEffect(() => {
    const el = host();
    if (!el || !focusable) return;
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapper, focusable, onKeyDown]);
}
