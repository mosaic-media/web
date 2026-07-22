// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The component registry — the heart of the SDUI loop. A `type` string in the
 * server payload resolves to a React component here. Registering a component is
 * how a new node type becomes renderable.
 *
 * Unknown types do not throw. They render an <Unknown> placeholder, so an older
 * Shell degrades gracefully when the Platform (or a module) sends a node it has
 * never heard of. That forward-compatibility is the whole point of an open
 * vocabulary.
 */

import type { ComponentType } from "react";
import type { UINode } from "./types";

export interface NodeComponentProps {
  node: UINode;
}

export type NodeComponent = ComponentType<NodeComponentProps>;

const registry = new Map<string, NodeComponent>();

export function register(type: string, component: NodeComponent): void {
  // Re-registration is expected: a client boots with the bundled fallback
  // definitions, then the Platform pushes the authoritative library on connect
  // (ADR 0024) and each definition re-registers over its fallback. So this is a
  // silent overwrite — the last writer (the Platform) wins.
  registry.set(type, component);
}

export function registerAll(entries: Record<string, NodeComponent>): void {
  for (const [type, component] of Object.entries(entries)) {
    register(type, component);
  }
}

export function resolve(type: string): NodeComponent | undefined {
  return registry.get(type);
}

export function registeredTypes(): string[] {
  return [...registry.keys()].sort();
}

/** Read a typed prop off a node with a fallback. Keeps components terse. */
export function prop<T>(node: UINode, key: string, fallback: T): T {
  const v = node.props?.[key];
  return (v === undefined ? fallback : (v as T));
}
