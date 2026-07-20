// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Component definitions — the tech-agnostic way a module (or the Platform)
 * introduces a NEW component without shipping client code. A definition is pure
 * data: a name, default params, and a `template` that is itself a tree of
 * primitives (and other registered types). Every client ships one generic
 * expander (this file, on web) and can then render any definition it is handed
 * — at build time or delivered in a payload at runtime.
 *
 * Template syntax, minimal on purpose:
 *   { "$bind": "path" }        as any prop value → the caller's arg. Dot paths
 *                                                   ("s.label") walk objects.
 *   { "$match": { on, cases, default } }          → pick a value by an enum
 *   props: { "$if": <value> } on a node           → render only if truthy
 *   props: { "$each": <array>, "$as": "s" }        → repeat the node per item,
 *                                                   exposing s / sIndex
 *   { "type": "Outlet", props: { name? } }         → the caller's children / slot
 *
 * Because the whole thing is JSON, a Flutter client implements the same rules
 * and renders module components identically. No native code crosses the
 * boundary — only definitions.
 */

import type { ReactElement } from "react";
import type { UINode } from "./types";
import { register } from "./registry";
import { RenderNode } from "./Renderer";

export interface ComponentDefinition {
  /** The node type this definition provides, e.g. "StatChip". */
  name: string;
  /** Default param values, overridden by the caller's props. */
  params?: Record<string, unknown>;
  /** The primitive tree, with $bind / $if / Outlet markers. */
  template: UINode;
}

type Args = Record<string, unknown>;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isBind(v: unknown): v is { $bind: string } {
  return isObj(v) && "$bind" in v;
}
function isMatch(v: unknown): v is { $match: { on: unknown; cases: Record<string, unknown>; default?: unknown } } {
  return isObj(v) && "$match" in v;
}

/** Walk a dot path ("s.label") through args/objects. */
function getPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (isObj(acc) ? acc[key] : undefined), root);
}

/** Resolve a template value against args: bindings, matches, nested structures. */
function resolveValue(v: unknown, args: Args): unknown {
  if (isBind(v)) return getPath(args, v.$bind);
  if (isMatch(v)) {
    const key = String(resolveValue(v.$match.on, args));
    const chosen = key in v.$match.cases ? v.$match.cases[key] : v.$match.default;
    return resolveValue(chosen, args);
  }
  if (Array.isArray(v)) return v.map((x) => resolveValue(x, args));
  if (isObj(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = resolveValue(val, args);
    return out;
  }
  return v;
}

/** Expand one template node into zero or more concrete nodes. */
function expandNode(tmpl: UINode, args: Args, host: UINode): UINode[] {
  // Outlet → whatever the caller passed as children / a named slot.
  if (tmpl.type === "Outlet") {
    const name = tmpl.props?.name as string | undefined;
    if (name) {
      const slot = host.slots?.[name];
      if (!slot) return [];
      return Array.isArray(slot) ? slot : [slot];
    }
    return host.children ?? [];
  }

  const rawProps = tmpl.props ?? {};

  // $each — repeat this node once per item of a bound array, exposing the item
  // (and its index) under $as. The repeated node is expanded without $each.
  if ("$each" in rawProps) {
    const arr = resolveValue(rawProps.$each, args);
    if (!Array.isArray(arr)) return [];
    const as = (rawProps.$as as string | undefined) ?? "item";
    const rest: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(rawProps)) {
      if (k !== "$each" && k !== "$as") rest[k] = val;
    }
    const bare: UINode = { type: tmpl.type, id: tmpl.id, props: rest, children: tmpl.children, slots: tmpl.slots };
    return arr.flatMap((item, i) => expandNode(bare, { ...args, [as]: item, [`${as}Index`]: i }, host));
  }

  // $if / $ifNot guards — drop the node (and its subtree) conditionally.
  if ("$if" in rawProps && !resolveValue(rawProps.$if, args)) return [];
  if ("$ifNot" in rawProps && resolveValue(rawProps.$ifNot, args)) return [];

  const props: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(rawProps)) {
    if (k === "$if" || k === "$ifNot") continue;
    props[k] = resolveValue(val, args);
  }

  const children = tmpl.children?.flatMap((c) => expandNode(c, args, host));

  let slots: UINode["slots"] | undefined;
  if (tmpl.slots) {
    slots = {};
    for (const [k, val] of Object.entries(tmpl.slots)) {
      const arr = Array.isArray(val) ? val : [val];
      slots[k] = arr.flatMap((c) => expandNode(c, args, host));
    }
  }

  return [{ type: tmpl.type, id: tmpl.id, props, children, slots }];
}

/**
 * Register a component definition as a renderable node type. Calling this is
 * exactly what a module does to contribute a component — here it happens in TS,
 * but the same `ComponentDefinition` could arrive as JSON in a payload and be
 * registered at runtime.
 */
export function defineComponent(def: ComponentDefinition): void {
  register(def.name, ({ node }): ReactElement => {
    const args: Args = { ...(def.params ?? {}), ...(node.props ?? {}) };
    const expanded = expandNode(def.template, args, node);
    return (
      <>
        {expanded.map((n, i) => (
          <RenderNode key={n.id ?? i} node={n} />
        ))}
      </>
    );
  });
}

/** Register many definitions at once (e.g. a module's whole component pack). */
export function defineComponents(defs: ComponentDefinition[]): void {
  defs.forEach(defineComponent);
}
