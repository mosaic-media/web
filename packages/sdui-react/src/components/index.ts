// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The component catalogue. Two tiers register here:
 *
 *   1. PRIMITIVES — the irreducible, client-provided vocabulary. This is the
 *      only native code, and it is the tech-agnostic contract each client (web,
 *      Flutter) implements. Presentational (Box/Text/Image/Icon/Spacer/Fragment/
 *      Outlet), interactive/stateful (Pressable + the form inputs, Tabs, Menu,
 *      RatingControl, SeasonSelector), and computed/animated (ProgressBar,
 *      Skeleton) leaves that a static data tree genuinely cannot express.
 *
 *   2. DEFINITIONS — every *composition*, expressed as primitive trees
 *      (definitions.ts + definitions.layout.ts). There are no hand-coded
 *      component "holdouts": if it composes primitives, it is data. A module
 *      contributes the same way (mock/moduleComponents.ts).
 */

import { registerAll } from "../sdui/registry";
import { defineComponents } from "../sdui/template";

import { Box, Text, Image, IconPrimitive, Pressable, Spacer, Fragment, Outlet } from "./primitives";
import { Tabs } from "./layout";
import { TextInput, Switch, SelectInput, Menu, SearchBar, Slider, RatingControl, ProgressBar } from "./controls";
import { SeasonSelector } from "./media";
import { Skeleton } from "./feedback";
import { PLATFORM_DEFINITIONS } from "./definitions";
import { LAYOUT_DEFINITIONS } from "./definitions.layout";

let installed = false;

/** Idempotently register the vocabulary + all definitions. Call once at boot. */
export function installComponents(): void {
  if (installed) return;
  installed = true;

  registerAll({
    // 1. primitives — presentational
    Box,
    Text,
    Image,
    Icon: IconPrimitive,
    Pressable,
    Spacer,
    Fragment,
    Outlet,

    // 1. primitives — interactive / stateful (own their state)
    Tabs,
    Menu,
    SearchBar,
    TextInput,
    Switch,
    SelectInput,
    Slider,
    RatingControl,
    SeasonSelector,

    // 1. primitives — computed / animated
    ProgressBar,
    Skeleton,
  });

  // 2. definitions — every composition, as data.
  defineComponents([...PLATFORM_DEFINITIONS, ...LAYOUT_DEFINITIONS]);
}
