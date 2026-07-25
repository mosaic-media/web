// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The native vocabulary — and ONLY the native vocabulary.
 *
 * This file registers primitives: the irreducible leaves a data tree genuinely
 * cannot express. Presentational (Box/Text/Image/Icon/Spacer/Fragment/Outlet),
 * interactive/stateful (Pressable and the form inputs, Tabs, Menu,
 * RatingControl, SeasonSelector, NavItem), computed/animated (ProgressBar,
 * Skeleton), and the player. Growing this set is the one thing that needs a
 * client release (ADR 0024).
 *
 * **This client ships no components.** Every composition — PosterCard, Section,
 * the app frame, the settings frame — is a DEFINITION: data, authored once in
 * the contract (mosaic-sdui `definitions/*.json`) and pushed to this client by
 * the Platform over the session. They used to be bundled here as TypeScript,
 * which made them renderable by this client and no other, and let the published
 * contract's copy of the same components go stale unnoticed — three of the four
 * that lived in both had drifted. There is now one library and this is not it.
 *
 * A module contributes a component the same way, as data (mock/moduleComponents.ts).
 */

import { registerAll } from "../sdui/registry.js";
import { initAcrylic } from "../sdui/acrylic.js";

import { Box, Text, Image, IconPrimitive, Pressable, Spacer, Fragment, Outlet } from "./primitives.js";
import { NavItem } from "./shell.js";
import { Tabs, NavBar, Rotator, State } from "./layout.js";
import { TextInput, Switch, SelectInput, Menu, SearchBar, SubmitField, Slider, RatingControl, ProgressBar, ProgressRing } from "./controls.js";
import { SeasonSelector } from "./media.js";
import { Player } from "./player.js";
import { Skeleton } from "./feedback.js";

/**
 * The native vocabulary, as data.
 *
 * It is a named export rather than an argument written inline at the
 * registration call because it is also the answer to "what does this client
 * implement?" — the declaration the Platform negotiates against
 * (mosaic.session.v1.VocabularyProfile). sdui/vocabulary.ts asserts at compile
 * time that this map and the declared list name the same set, in both
 * directions, so the two cannot disagree.
 */
export const NATIVE_COMPONENTS = {
  // primitives — presentational
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
  // 1. primitive — the home's auto-advancing cinematic hero carousel
  Rotator,

  // 1. primitive — the scope that remembers what was typed (ADR 0087). It
  // draws nothing; it is native because a static tree cannot hold a value
  // between two renders, and because it *is* the scope boundary.
  State,
  Menu,
  SearchBar,
  SubmitField,
  TextInput,
  Switch,
  SelectInput,
  Slider,
  RatingControl,
  SeasonSelector,

  // 1. primitive — the playback surface (ADR 0047). The server issues a
  // ticket; the client owns the decoding pipeline and the transport controls.
  Player,

  // 1. primitives — computed / animated
  ProgressBar,
  ProgressRing,
  Skeleton,
} as const;

let installed = false;

/** Idempotently register the native vocabulary. Call once at boot. Components
 *  arrive from the Platform; nothing here registers one. */
export function installComponents(): void {
  if (installed) return;
  installed = true;

  registerAll(NATIVE_COMPONENTS);

  // 2. acrylic material — start the Optical Parallax pass that lights glass
  // surfaces relative to the artwork (a WEB skin concern; no-op server-side).
  initAcrylic();
}
