// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Focus and spatial navigation (ADR 0092).
 *
 * The contract says which nodes are worth landing on, which sets behave as one
 * stop, where focus starts, and where the geometric answer is wrong. This is the
 * geometry — the part that belongs to the client, because it depends on where
 * things actually ended up on screen, which only the renderer knows.
 *
 * The web gets it nearly free from the browser and a television gets nothing:
 * there is no tab key on a remote, only a direction pad, and every press must
 * resolve to exactly one node or the viewer is stuck. Implementing it here, on
 * the platform that needs it least, is what makes the contract's focus model
 * something other than a guess.
 */

const FOCUSABLE = "[data-focusable='true']";

/** Directions the contract declares. Kept beside the geometry that uses them. */
export type FocusDirection = "up" | "down" | "left" | "right";

/**
 * The nearest focusable element in a direction.
 *
 * Nearest is measured from centre to centre, but only among elements actually
 * *in* that direction — a card to the left is not a candidate for "right" no
 * matter how close it is. Distance is weighted so the primary axis dominates:
 * without it, pressing right in a grid jumps diagonally to whatever happens to
 * be nearest by straight-line distance, which reads as the focus jumping about
 * at random.
 */
export function nearestInDirection(from: Element, direction: FocusDirection, scope: ParentNode = document): Element | null {
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;

  let best: Element | null = null;
  let bestScore = Infinity;

  for (const el of scope.querySelectorAll(FOCUSABLE)) {
    if (el === from) continue;
    const b = el.getBoundingClientRect();
    // Zero-sized elements are not on screen; landing focus on one is a viewer
    // pressing a direction and seeing nothing happen.
    if (b.width === 0 && b.height === 0) continue;
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    const dx = bx - ax;
    const dy = by - ay;

    let along: number;
    let across: number;
    switch (direction) {
      case "left":
        along = -dx;
        across = Math.abs(dy);
        break;
      case "right":
        along = dx;
        across = Math.abs(dy);
        break;
      case "up":
        along = -dy;
        across = Math.abs(dx);
        break;
      default:
        along = dy;
        across = Math.abs(dx);
    }
    if (along <= 0) continue; // not in this direction at all

    // The across-axis penalty is what stops a grid navigating diagonally. Four
    // is arbitrary and stated: high enough that a neighbour in the same row
    // always beats one a row away, low enough that a slightly offset item is
    // still reachable.
    const score = along + across * 4;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/** Every focusable element inside a group, in document order. */
export function focusablesIn(group: Element): HTMLElement[] {
  return [...group.querySelectorAll<HTMLElement>(FOCUSABLE)];
}

/**
 * Apply the roving tabindex to a group: one member is tabbable, the rest are
 * reachable only by direction.
 *
 * This is the whole reason focus groups are in the contract. A rail of forty
 * cards is *one* stop in the tab order — a keyboard user pressing tab should
 * pass the rail, not traverse it — and which of the forty is the stop is the one
 * they last used, not always the first.
 */
export function applyRoving(group: Element, active: Element | null): void {
  const members = focusablesIn(group);
  if (members.length === 0) return;
  const current = active && members.includes(active as HTMLElement) ? active : members[0]!;
  for (const el of members) el.tabIndex = el === current ? 0 : -1;
}
