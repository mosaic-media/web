// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Accessibility props, applied (ADR 0091).
 *
 * The contract declares role, accessible name, heading level and live-region
 * politeness as props any node may carry. This is the web's mapping of them —
 * ARIA attributes — and the mapping is the reason the role set is closed: a
 * Compose client maps the same role to a semantics property and a SwiftUI client
 * to a trait, so a role one of them does not recognise produces a control that
 * is invisible to a screen reader and looks correct to everybody else.
 *
 * An unrecognised role is dropped rather than passed through to the DOM. Passing
 * it through would put an invalid ARIA role on the element, which browsers treat
 * as *no* role — the same outcome, arrived at silently, and with the contract's
 * closed set quietly bypassed.
 */

import { ROLES } from "./native";

export { ROLES };

/** The ARIA attributes a node's accessibility props map to. */
export interface A11yAttrs {
  role?: string;
  "aria-label"?: string;
  "aria-level"?: number;
  "aria-live"?: "polite" | "assertive";
}

const LIVE = new Set(["polite", "assertive"]);

/**
 * Map a node's props to ARIA attributes, dropping anything the contract does
 * not declare.
 *
 * A heading role without a level is still a heading — the outline just does not
 * know how deep — so the two are independent rather than one requiring the
 * other. A level outside 1–6 is dropped: a screen reader's heading navigation
 * skips it, so passing it on buys nothing and hides the mistake.
 */
export function a11yAttrs(props: Record<string, unknown> | undefined): A11yAttrs {
  if (!props) return {};
  const out: A11yAttrs = {};

  const role = props.role;
  if (typeof role === "string" && (ROLES as readonly string[]).includes(role)) out.role = role;

  const label = props.a11yLabel;
  if (typeof label === "string" && label !== "") out["aria-label"] = label;

  const level = props.headingLevel;
  if (typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 6) out["aria-level"] = level;

  const live = props.live;
  if (typeof live === "string" && LIVE.has(live)) out["aria-live"] = live as "polite" | "assertive";

  return out;
}
