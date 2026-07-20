// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The component catalogue. Importing this module registers every built-in node
 * type into the SDUI registry. Three tiers register here, in order:
 *
 *   1. Primitives      — the irreducible building blocks (Box/Text/Image/…).
 *   2. Native components — containers + interactive controls that carry state
 *                          or behaviour, so they can't be pure primitive trees.
 *   3. Definitions     — presentational components expressed AS primitive trees
 *                        (PosterCard so far; step B moves the rest here).
 *
 * A module extends any tier: register() a native component, or defineComponent()
 * a definition delivered as data.
 */

import { registerAll } from "@/sdui/registry";
import { defineComponents } from "@/sdui/template";

import { Box, Text, Image, IconPrimitive, Pressable, Spacer, Fragment, Outlet } from "./primitives";
import { Screen, Section, Carousel, Grid, Stack, Tabs, Divider } from "./layout";
import { Menu, SearchBar, TextField, Toggle, Select, Slider, RatingControl, ProgressBar, Pagination } from "./controls";
import { SeasonSelector, RelatedRail } from "./media";
import { Skeleton, ErrorState } from "./feedback";
import { PLATFORM_DEFINITIONS } from "./definitions";

let installed = false;

/** Idempotently register all built-in components. Call once at boot. */
export function installComponents(): void {
  if (installed) return;
  installed = true;

  registerAll({
    // 1. primitives
    Box,
    Text,
    Image,
    Icon: IconPrimitive,
    Pressable,
    Spacer,
    Fragment,
    Outlet,

    // 2. native — layout containers
    Screen,
    Section,
    Carousel,
    Grid,
    Stack,
    Tabs,
    Divider,

    // 2. native — interactive controls (state). Button/IconButton are now
    // definitions.
    Menu,
    SearchBar,
    TextField,
    Toggle,
    Select,
    Slider,
    RatingControl,
    ProgressBar,
    Pagination,

    // 2. native — media. SeasonSelector holds selection state; RelatedRail
    // branches on child count. Everything else presentational moved to
    // definitions.
    SeasonSelector,
    RelatedRail,

    // 2. native — feedback. Skeleton (keyframe animation) and ErrorState
    // (category→tone mapping) stay native.
    Skeleton,
    ErrorState,
  });

  // 3. definitions — presentational components built from primitives.
  defineComponents(PLATFORM_DEFINITIONS);
}
