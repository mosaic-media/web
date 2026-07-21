// A simulated module contributing a component as pure data — exactly what a
// real module ships. The storybook registers it so "Module-defined" renders.

import { defineComponents, type ComponentDefinition } from "@mosaic-media/sdui-react";

const statChip: ComponentDefinition = {
  name: "module.StatChip",
  params: { icon: "star", tone: "accent" },
  template: {
    type: "Box",
    props: { style: { direction: "row", align: "center", gap: 2, bg: "surface-raised", border: true, radius: "pill", px: 3, py: 1 } },
    children: [
      { type: "Icon", props: { name: { $bind: "icon" }, color: { $bind: "tone" }, size: "1em" } },
      { type: "Text", props: { text: { $bind: "label" }, style: { variant: "sm", color: "text-muted" } } },
      { type: "Text", props: { text: { $bind: "value" }, style: { variant: "sm", weight: "bold" } } },
    ],
  },
};

export function installModuleExamples(): void {
  defineComponents([statChip]);
}
