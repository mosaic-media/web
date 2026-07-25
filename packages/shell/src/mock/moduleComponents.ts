// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Simulated module-contributed components. This stands in for what a real
 * module would deliver: ComponentDefinitions — pure data — that compose the
 * Shell's primitives into new components the Platform never shipped. The Shell
 * has no special knowledge of these; it expands them like any definition. A
 * Flutter client handed the same definitions renders them identically.
 *
 * In production these would arrive over the wire (a module's manifest / a
 * payload) and be registered at runtime; here we register them at boot.
 *
 * The names are namespaced `demo:Type` because that is the contract's rule
 * (ADR 0085): a core type is unprefixed, a module's carries the id of the module
 * that owns it, and the Platform refuses a module tree that breaks it. These
 * used to be `module.StatChip` — a separator invented here, in a client, for a
 * convention that did not exist yet, which is the small version of exactly the
 * drift this simulation is meant to be honest about.
 */

import { defineComponents, type ComponentDefinition } from "@mosaic-media/sdui-react";

const statChip: ComponentDefinition = {
  name: "demo:StatChip",
  params: { icon: "star", tone: "accent" },
  template: {
    type: "Box",
    props: {
      style: { direction: "row", align: "center", gap: 2, bg: "surface-raised", border: true, radius: "pill", px: 3, py: 1 },
    },
    children: [
      { type: "Icon", props: { name: { $bind: "icon" }, color: { $bind: "tone" }, size: "1em" } },
      { type: "Text", props: { text: { $bind: "label" }, style: { variant: "sm", color: "text-muted" } } },
      { type: "Text", props: { text: { $bind: "value" }, style: { variant: "sm", weight: "bold" } } },
    ],
  },
};

// Demonstrates Outlet: the caller's children flow into the panel body.
const panel: ComponentDefinition = {
  name: "demo:Panel",
  template: {
    type: "Box",
    props: { style: { gap: 3, p: 4, bg: "surface", border: true, radius: "lg" } },
    children: [
      { type: "Text", props: { text: { $bind: "title" }, style: { variant: "lg", weight: "bold" } } },
      { type: "Outlet" },
    ],
  },
};

let installed = false;

export function installMockModuleComponents(): void {
  if (installed) return;
  installed = true;
  defineComponents([statChip, panel]);
}
