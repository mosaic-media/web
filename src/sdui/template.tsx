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
 *   { "$bind": "paramName" }   as any prop value → the caller's arg (or default)
 *   props: { "$if": <binding> } on a node       → render only if truthy
 *   { "type": "Outlet", props: { name? } }       → the caller's children / slot
 *
 * Because the whole thing is JSON, a Flutter client implements the same three
 * rules and renders module components identically. No native code crosses the
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

function isBind(v: unknown): v is { $bind: string } {
  return typeof v === "object" && v !== null && "$bind" in (v as Record<string, unknown>);
}

/** Resolve a template value against args: replace bindings, recurse structures. */
function resolveValue(v: unknown, args: Args): unknown {
  if (isBind(v)) return args[v.$bind];
  if (Array.isArray(v)) return v.map((x) => resolveValue(x, args));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = resolveValue(val, args);
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

  // $if guard — drop the node (and its subtree) when the condition is falsy.
  if ("$if" in rawProps && !resolveValue(rawProps.$if, args)) {
    return [];
  }

  const props: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(rawProps)) {
    if (k === "$if") continue;
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
