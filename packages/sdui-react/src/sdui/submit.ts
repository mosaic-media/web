// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

import type { Action } from "./types.js";

/**
 * Merge a form's collected values into the action the submit carries.
 *
 * Extracted from the dispatcher so the conformance corpus can run it. It lived
 * inline for the whole life of forms, which meant the one rule the whole feature
 * rests on — whose value wins — was reachable only by filling in a form and
 * looking at what arrived. It got that rule backwards, and nothing anywhere
 * failed (ADR 0096).
 *
 * Two rules, and both were learned the hard way:
 *
 * **The scope wins over the action's input** for the names the form declares;
 * the action supplies everything else. This reverses what ADR 0088 stated. A
 * module's `configureModule` replaces its whole settings document, so the action
 * must carry every field — including the one being edited, which it sends blank
 * so the form does not render the old value back. Under "the producer's value
 * wins" that blank overwrote what was typed and the form saved nothing, with no
 * error on any side. A producer that genuinely wants to pin a field simply does
 * not declare it in the form's scope.
 *
 * **`into` names where the values land.** "settings" for a module's
 * configureModule, absent for the top level. Without it the values could only
 * ever arrive at the top of the input, which is the structural reason the string
 * substitution this replaced survived four attempts to remove it.
 *
 * Anything that is not an `invoke` is returned untouched: there is no input to
 * merge into, and inventing one would send a navigate somewhere it was not
 * pointed.
 */
export function mergeSubmit(inner: Action, values: Record<string, unknown>, into?: string): Action {
  if (inner.kind !== "invoke") return inner;
  const input = inner.input ?? {};
  if (!into) return { ...inner, input: { ...input, ...values } };
  const nested = (input[into] as Record<string, unknown> | undefined) ?? {};
  return { ...inner, input: { ...input, [into]: { ...nested, ...values } } };
}
