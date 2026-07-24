// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Applying a served token set.
 *
 * The Platform pushes the design tokens on connect (ADR 0040's skin tier), and
 * this writes them onto the document as CSS custom properties — the same names
 * the bootstrap sheet defines, so every value the interface draws with comes
 * from the server the moment it arrives.
 *
 * It is deliberately thin. This client does not decide what anything looks like:
 * it does not interpret a token, derive one, or supply a default for a missing
 * one. Values come from the contract; the FORMULAS over them (color-mix, the
 * gradients, the acrylic layers) live in skin.css and read whatever these
 * resolve to. Nothing here needs to know what "accent" means.
 */

/** A DTCG leaf as the contract serves it. */
interface TokenValue {
  $value: string | number;
  $type?: string;
}

/** The served set: a theme-independent base, plus one group per theme. */
export interface TokenSet {
  base?: Record<string, TokenValue>;
  themes?: Record<string, Record<string, TokenValue>>;
}

function write(id: string, selector: string, group: Record<string, TokenValue>): void {
  if (typeof document === "undefined" || Object.keys(group).length === 0) return;
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    // Appended last so it wins over the bootstrap sheet without !important:
    // same specificity, later wins.
    document.head.appendChild(el);
  }
  const body = Object.entries(group)
    .map(([name, tok]) => `  --${name}: ${String(tok.$value)};`)
    .join("\n");
  el.textContent = `${selector} {\n${body}\n}`;
}

/**
 * Apply a served token set over the bootstrap skin.
 *
 * Malformed input is not this client's problem to repair: a set with no groups
 * writes nothing and the app keeps the skin it booted with, which is styled and
 * usable. Silently inventing values would hide a broken payload behind an
 * interface that looks fine and is not the one the server described.
 */
export function applyTokens(set: TokenSet | null | undefined): void {
  if (!set || typeof set !== "object") return;
  if (set.base) write("msc-tokens-base", ":root", set.base);
  for (const [theme, group] of Object.entries(set.themes ?? {})) {
    // The dark theme is also the default, matching the bootstrap sheet's
    // `:root, :root[data-theme="dark"]`.
    const selector = theme === "dark" ? ':root, :root[data-theme="dark"]' : `:root[data-theme="${theme}"]`;
    write(`msc-tokens-${theme}`, selector, group);
  }
}
