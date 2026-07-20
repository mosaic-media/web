// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Platform component definitions — components expressed purely as primitive
 * trees rather than bespoke React. This is the target model (step B): a
 * presentational component is data, not code, so any client renders it and a
 * module can define its own the same way.
 *
 * PosterCard is the first proof: if the primitive vocabulary can rebuild one of
 * the Shell's own components, it can build a module's. Interaction flourish that
 * needs real hover/animation (the play-overlay reveal) is intentionally dropped
 * here — that belongs to interactive primitives, not to static composition.
 */

import type { ComponentDefinition } from "@/sdui/template";

const posterCard: ComponentDefinition = {
  name: "PosterCard",
  params: { title: "Untitled" },
  template: {
    type: "Pressable",
    props: { action: { $bind: "action" }, lift: true, style: { gap: 2 } },
    children: [
      {
        // art
        type: "Box",
        props: {
          style: {
            position: "relative",
            radius: "md",
            overflow: "hidden",
            aspectRatio: "2 / 3",
            bg: "surface-raised",
            shadow: "1",
          },
        },
        children: [
          {
            type: "Image",
            props: {
              src: { $bind: "poster" },
              alt: { $bind: "title" },
              placeholder: { $bind: "mediaType" },
              style: { width: "full", height: "full" },
            },
          },
          {
            type: "Box",
            props: {
              $if: { $bind: "badge" },
              style: { position: "absolute", top: 2, left: 2, bg: "surface-overlay", radius: "sm", px: 2, py: 1 },
            },
            children: [{ type: "Text", props: { text: { $bind: "badge" }, style: { variant: "xs", weight: "medium" } } }],
          },
          {
            type: "Box",
            props: { $if: { $bind: "progress" }, style: { position: "absolute", left: 2, right: 2, bottom: 2 } },
            children: [{ type: "ProgressBar", props: { value: { $bind: "progress" } } }],
          },
        ],
      },
      {
        // meta
        type: "Box",
        children: [
          { type: "Text", props: { text: { $bind: "title" }, style: { variant: "sm", weight: "medium", lineClamp: 1 } } },
          {
            type: "Text",
            props: { $if: { $bind: "subtitle" }, text: { $bind: "subtitle" }, style: { variant: "xs", color: "text-muted" } },
          },
        ],
      },
    ],
  },
};

export const PLATFORM_DEFINITIONS: ComponentDefinition[] = [posterCard];
