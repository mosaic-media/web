// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Bindable props, the rendering half.
 *
 * A prop value is a literal, or a binding naming a path this client resolves
 * where the node renders. Before this a prop was a literal in every position,
 * and the only escape was SubmitField substituting the literal string "$value"
 * into its action — one field, specced nowhere, and substituted *everywhere* it
 * appeared, which is why no screen could carry two inputs.
 *
 * A binding names a path and nothing else. There is no formatting, no default,
 * no expression and no operator; formatting stays server-side, which is what
 * "presentation-ready data" means and the reason this file is fifty lines rather
 * than an evaluator.
 *
 * The marker is the same string a definition template uses, because it means the
 * same thing — resolve a path against a scope. The two were separate mechanisms
 * that happened to share a spelling; template.tsx now reads bindings through
 * this file, so there is one rule for what counts as one.
 */

import { BINDING_MARKER } from "./native.js";

export { BINDING_MARKER };

/** A prop value resolved where the node renders. */
export type Binding = { [k: string]: string };

/**
 * Is this value a binding?
 *
 * Exactly one key, and it is the marker, and its value is a non-empty string.
 * An object carrying the marker beside anything else is a literal object — the
 * same closed reading the contract uses, so a producer's own data with a field
 * of this name is never silently replaced by a lookup.
 */
export function isBinding(v: unknown): v is Binding {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const keys = Object.keys(v as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== BINDING_MARKER) return false;
  const path = (v as Record<string, unknown>)[BINDING_MARKER];
  return typeof path === "string" && path.length > 0;
}

/** The path a binding names, or undefined if the value is not one. */
export function bindingPath(v: unknown): string | undefined {
  return isBinding(v) ? (v as Record<string, string>)[BINDING_MARKER] : undefined;
}

/**
 * How a path is looked up. It is a function rather than an object because a
 * binding no longer resolves against one bag: it resolves against the nearest
 * enclosing State scope that declares the name, then outward, and only then
 * against the screen's params. Passing a merged object instead would flatten
 * that order and let an outer scope's value shadow an inner one.
 */
export type BindingScope = (path: string) => unknown;

/** Walk a dot path through a scope. Shared with the template expander so a
 *  binding means the same thing in a screen and in a definition. */
export function getPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, key) => (typeof acc === "object" && acc !== null ? (acc as Record<string, unknown>)[key] : undefined),
    root,
  );
}

/**
 * Resolve every binding in a props bag against a scope.
 *
 * Returns the *same object* when nothing was bound, so a tree with no bindings —
 * which is every tree today — costs one shallow scan per node and allocates
 * nothing.
 *
 * An unresolved binding yields `undefined`, which deletes the prop: the
 * component then falls back exactly as if the server had not set it. Yielding ""
 * instead would make "no value" and "the empty value" indistinguishable, which
 * is the shape of every silent-prop failure this contract has had.
 */
export function resolveProps(
  props: Record<string, unknown> | undefined,
  scope: BindingScope,
): Record<string, unknown> | undefined {
  if (!props) return props;
  let out: Record<string, unknown> | undefined;
  for (const [key, val] of Object.entries(props)) {
    const resolved = resolveValue(val, scope);
    if (resolved === val) continue;
    if (!out) out = { ...props };
    if (resolved === undefined) delete out[key];
    else out[key] = resolved;
  }
  return out ?? props;
}

/** Resolve one value, walking into arrays and objects so a binding nested inside
 *  a prop (a meta line, an action's input) resolves too. */
function resolveValue(v: unknown, scope: BindingScope): unknown {
  const path = bindingPath(v);
  if (path !== undefined) return scope(path);
  if (Array.isArray(v)) {
    let changed = false;
    const out = v.map((x) => {
      const r = resolveValue(x, scope);
      if (r !== x) changed = true;
      return r;
    });
    return changed ? out : v;
  }
  if (typeof v === "object" && v !== null) {
    const entries = Object.entries(v as Record<string, unknown>);
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, val] of entries) {
      const r = resolveValue(val, scope);
      if (r !== val) changed = true;
      out[k] = r;
    }
    return changed ? out : v;
  }
  return v;
}
