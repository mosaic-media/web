// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The component catalogue. Two tiers register here:
 *
 *   1. PRIMITIVES — the irreducible, client-provided vocabulary. This is the
 *      only native code, and it is the tech-agnostic contract each client (web,
 *      Flutter) implements. Presentational (Box/Text/Image/Icon/Spacer/Fragment/
 *      Outlet), interactive/stateful (Pressable + the form inputs, Tabs, Menu,
 *      RatingControl, SeasonSelector, NavItem), and computed/animated
 *      (ProgressBar, Skeleton) leaves that a static data tree genuinely cannot
 *      express.
 *
 *   2. DEFINITIONS — every *composition*, expressed as primitive trees
 *      (definitions.ts + definitions.layout.ts). There are no hand-coded
 *      component "holdouts": if it composes primitives, it is data — including
 *      the app frame (AppShell), so its shape is server-owned. A module
 *      contributes the same way (mock/moduleComponents.ts).
 */

import { registerAll } from "../sdui/registry";
import { defineComponents } from "../sdui/template";
import { initAcrylic } from "../sdui/acrylic";

import { Box, Text, Image, IconPrimitive, Pressable, Spacer, Fragment, Outlet } from "./primitives";
import { NavItem } from "./shell";
import { Tabs, NavBar } from "./layout";
import { TextInput, Switch, SelectInput, Menu, SearchBar, SubmitField, Slider, RatingControl, ProgressBar, ProgressRing } from "./controls";
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

    // 1. primitive — the server-emitted app frame's one stateful leaf (ADR
    // 0031). The frame itself (AppShell) is now a definition (definitions.layout),
    // but NavItem owns active-route state, so it stays native.
    NavItem,

    // 1. primitives — interactive / stateful (own their state)
    Tabs,
    // 1. primitive — the responsive nav group (inline top / bottom tab bar)
    NavBar,
    Menu,
    SearchBar,
    SubmitField,
    TextInput,
    Switch,
    SelectInput,
    Slider,
    RatingControl,
    SeasonSelector,

    // 1. primitives — computed / animated
    ProgressBar,
    ProgressRing,
    Skeleton,
  });

  // 2. definitions — every composition, as data.
  defineComponents([...PLATFORM_DEFINITIONS, ...LAYOUT_DEFINITIONS]);

  // 3. acrylic material — start the Optical Parallax pass that lights glass
  // surfaces relative to the artwork (a WEB skin concern; no-op server-side).
  initAcrylic();
}
