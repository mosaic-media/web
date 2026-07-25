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
  "submit",
  "playPart",
  "toast",
  "sequence",
  "query",
] as const;

/**
 * The two closed sets, by name.
 *
 * Here rather than in validate.ts so the conformance script can read them from a
 * module that imports nothing — and checked against the contract's fixture in
 * both directions, because a validator the contract declares and this client
 * does not implement is a rule the server can state that nothing enforces.
 */
export const VALIDATORS = ["matches", "maxLength", "minLength", "oneOf", "pattern", "required"] as const;
export const PREDICATES = ["all", "any", "equals", "not", "notEmpty", "oneOf"] as const;

/**
 * The closed accessible-role set (ADR 0091).
 *
 * Here with the rest of the bare vocabulary data so the conformance script can
 * measure it against the contract's fixture without loading React. A role this
 * client does not recognise is dropped rather than passed to the DOM, so a set
 * that had drifted would silently discard roles the server was correctly
 * sending.
 */
export const ROLES = [
  "alert", "button", "dialog", "group", "heading", "img", "link", "list", "listitem",
  "main", "navigation", "none", "progressbar", "region", "search", "status",
  "tab", "tablist", "tabpanel",
] as const;

/** The closed set of directions a nextFocus override may name (ADR 0092). */
export const FOCUS_DIRECTIONS = ["up", "down", "left", "right"] as const;
