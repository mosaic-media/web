// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Rendered when the registry has no component for a node's `type`. This is the
 * forward-compatibility guarantee: an old Shell shown a new node type degrades
 * to a labelled placeholder instead of throwing. Visible in dev, quiet enough
 * not to wreck a layout in production.
 */

export function Unknown({ type }: { type: string }) {
  return (
    <div className="msc-unknown" role="note" aria-label={`Unknown component: ${type}`}>
      <span className="msc-unknown__dot" aria-hidden />
      <code className="msc-unknown__type">{type}</code>
      <span className="msc-unknown__hint">not registered in this Shell</span>
    </div>
  );
}
