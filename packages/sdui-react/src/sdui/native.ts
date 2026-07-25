// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The native vocabulary as bare data: the node types this client renders itself
 * and the action kinds its dispatcher interprets.
 *
 * **This module imports nothing, on purpose.** It is what the Platform is told
 * on Attach (mosaic.session.v1.VocabularyProfile) and what
 * scripts/check-vocabulary.mjs measures against the contract's conformance
 * fixture — a plain Node script, run in the container after the build, which can
 * load a module with no dependencies and could not load one that pulls in React.
 *
 * The lists are not maintained by hand in any meaningful sense: vocabulary.ts
 * ties both of them to the code they describe with compile-time assertions, in
 * both directions. Adding a primitive to the registration map without adding it
 * here fails the build, and so does the reverse.
 */

/**
 * The single key that makes a prop value a binding rather than a literal.
 *
 * It lives here with the rest of the bare vocabulary data so
 * scripts/check-vocabulary.mjs can measure it against the contract's
 * conformance fixture: a client resolving a different marker than the server
 * emits would leave every bound prop as an unread literal object, drawing
 * nothing and reporting nothing.
 */
export const BINDING_MARKER = "$bind";

/** Node types this client implements natively (ADR 0024's primitive tier). */
export const NATIVE_PRIMITIVE_TYPES = [
  "Box",
  "Icon",
  "Image",
  "Fragment",
  "Menu",
  "NavBar",
  "NavItem",
  "Outlet",
  "Player",
  "Pressable",
  "ProgressBar",
  "ProgressRing",
  "RatingControl",
  "Rotator",
  "SearchBar",
  "SeasonSelector",
  "SelectInput",
  "Skeleton",
  "Slider",
  "Spacer",
  "State",
  "SubmitField",
  "Switch",
  "Tabs",
  "Text",
  "TextInput",
] as const;

/**
 * Action kinds this client's dispatcher interprets.
 *
 * The contract declares more — `query`, `setValue` and `submit` are in the
 * vocabulary and implemented by nobody yet. Declaring only what is real is the
 * point: the Platform strips an action of any other kind before sending it, and
 * says so, instead of this client silently doing nothing when it is pressed.
 */
export const NATIVE_ACTION_KINDS = [
  "navigate",
  "back",
  "openUrl",
  "invoke",
  "openOverlay",
  "closeOverlay",
  "setValue",
  "playPart",
  "toast",
  "sequence",
] as const;
