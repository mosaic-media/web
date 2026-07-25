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
import type { UINode } from "./types.js";

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

/*
 * Unknown types are reported, not merely drawn.
 *
 * The placeholder is the forward-compatibility guarantee and it stays. What it
 * was not is *observable*: a screen with a hole in it looked identical to a
 * screen without one to everybody except the person on that page, so a client
 * running behind the contract could go a release without anyone noticing. Since
 * the Platform now knows what this client declared and declines to send what it
 * cannot draw, a placeholder here means one of three things worth hearing about
 * — a module's own type, a definition that reached a client it was not filtered
 * for, or a declaration that is wrong.
 *
 * Deduped per type, because an unknown card in a rail of forty is one fact.
 */
type UnknownTypeReporter = (type: string) => void;

let reporter: UnknownTypeReporter | undefined;
const reported = new Set<string>();

/** Register the callback for the first sighting of each unknown type. The Shell
 *  wires this to whatever it reports through; without one, a warning is written
 *  to the console so the sighting is never silent. */
export function onUnknownType(cb: UnknownTypeReporter | undefined): void {
  reporter = cb;
}

/** Called by the renderer when a node's type resolves to nothing. */
export function reportUnknownType(type: string): void {
  if (reported.has(type)) return;
  reported.add(type);
  if (reporter) {
    reporter(type);
    return;
  }
  console.warn(`[mosaic-sdui] no component for node type "${type}" — this client cannot render it`);
}

/** Forget what has been reported. For a test, and for a reconnect that may have
 *  been served a different definition library than the one before it. */
export function resetUnknownTypes(): void {
  reported.clear();
}

/** Read a typed prop off a node with a fallback. Keeps components terse. */
export function prop<T>(node: UINode, key: string, fallback: T): T {
  const v = node.props?.[key];
  return (v === undefined ? fallback : (v as T));
}
