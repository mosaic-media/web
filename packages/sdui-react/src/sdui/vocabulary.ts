// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * What this client can render — the declaration it hands the Platform on Attach
 * (mosaic.session.v1.VocabularyProfile), and the proof that the declaration is
 * true of this client.
 *
 * The server used to emit into the dark. The vocabulary is versioned and it
 * grows; a client is released on its own schedule; and nothing on the wire
 * carried the answer to "can the thing I am about to send actually be drawn?"
 * An unsupported node became a labelled placeholder here and nothing anywhere
 * recorded it, which is the same silence as a prop nobody reads.
 *
 * A wrong declaration is worse than none — it has the server carefully degrade a
 * screen for abilities this client actually had — so neither list is trusted on
 * its word. The assertions below tie both to the code they describe, in both
 * directions, at compile time.
 *
 * The vocabulary *version* is deliberately absent. This package says what it
 * implements; which edition of the contract that is measured against comes from
 * `@mosaic-media/sdui`, which the Shell depends on and this package does not.
 */

import type { Action } from "./types";
import { NATIVE_PRIMITIVE_TYPES, NATIVE_ACTION_KINDS } from "./native";
import { NATIVE_COMPONENTS } from "../components";

export { NATIVE_PRIMITIVE_TYPES, NATIVE_ACTION_KINDS } from "./native";

export type NativePrimitiveType = (typeof NATIVE_PRIMITIVE_TYPES)[number];
export type NativeActionKind = (typeof NATIVE_ACTION_KINDS)[number];

/*
 * Primitives: the declaration and the registration map must name the same set.
 * Declare a type nothing registers and the server sends nodes that render as
 * placeholders; register one nothing declares and the server withholds nodes
 * this client could have drawn. Both are checked.
 */
type Registered = keyof typeof NATIVE_COMPONENTS;
type DeclaredPrimitivesAreRegistered = NativePrimitiveType extends Registered ? true : never;
type RegisteredPrimitivesAreDeclared = Registered extends NativePrimitiveType ? true : never;

/*
 * Actions: the declaration and the Action union must name the same set — and the
 * union is itself tied to the dispatcher by ShellProvider's default branch,
 * which narrows to `never` only when every case is covered. So the chain
 * declaration → union → switch is mechanical end to end, and
 * scripts/check-vocabulary.mjs measures the declaration against the contract.
 */
type DeclaredKindsAreImplemented = NativeActionKind extends Action["kind"] ? true : never;
type ImplementedKindsAreDeclared = Action["kind"] extends NativeActionKind ? true : never;

const declarationIsTrue: [
  DeclaredPrimitivesAreRegistered,
  RegisteredPrimitivesAreDeclared,
  DeclaredKindsAreImplemented,
  ImplementedKindsAreDeclared,
] = [true, true, true, true];
void declarationIsTrue;

/** The node types this client renders itself, sorted — what it declares. */
export const nativePrimitives: string[] = [...NATIVE_PRIMITIVE_TYPES].sort();

/** The declaration as the session contract carries it, minus the version — the
 *  Shell adds that from the contract package it is built against. */
export interface VocabularyDeclaration {
  primitives: string[];
  actions: string[];
}
