// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Named fields: the hook that puts an input's value somewhere other nodes can
 * see it (ADR 0088).
 *
 * An input has always owned its value in local component state, where nothing
 * else could read it — which is why the only way to submit one was SubmitField
 * substituting "$value" into an action, one field at a time, and why no screen
 * could carry two.
 *
 * An input with a `name` now writes into the nearest enclosing State scope that
 * declares it, and reads its value back from there. An input *without* a name
 * keeps exactly the behaviour it had: local state, invisible to everything else.
 * That is deliberate rather than transitional — a search box inside a form is
 * not one of the form's fields, and making every input join the nearest scope
 * would put it there.
 */

import { useCallback, useContext, useEffect, useState } from "react";
import { ScopeContext, lookup, write } from "./scope.js";
import { evaluate, type Predicate, type RuleSet } from "./validate.js";

/**
 * useField gives an input its value and a setter, from the scope when it is
 * named and declared there, and from local state otherwise.
 *
 * The fallback is not a failure path. A name that no scope declares means the
 * input is outside the form it thinks it is in, which is worth knowing, so it is
 * reported once — but the input still works locally rather than becoming inert,
 * because an unusable control is a worse answer to a misconfigured screen than a
 * control whose value nothing collects.
 */
export function useField<T>(
  name: string | undefined,
  initial: T,
  toScope: (v: T) => string,
  fromScope: (v: unknown) => T,
  rules?: RuleSet,
): [T, (next: T) => void] {
  const scope = useContext(ScopeContext);
  const [local, setLocal] = useState<T>(initial);

  // The rules travel to the scope so submitting can check a field that is on
  // screen but not visible: `visibleWhen` on the input itself returns null from
  // the component *after* this hook has run, so the rule is still registered
  // and a hidden required field is still checked.
  //
  // **It does not survive an unmounted branch, and that limit is real.**
  // `visibleWhen` on a Box removes the subtree, so the inputs inside it never
  // render, this effect never runs, and their rules are not in the scope when
  // the submit collects it. A multi-step form built that way is therefore
  // validated by the server rather than here — which is the boundary that
  // matters and was always going to run anyway, but it means the answer arrives
  // as a round trip and lands on a step nobody is looking at. A producer
  // building one should write its rejections to stand alone in the form-level
  // message, because that is the only part of it the person can see.
  useEffect(() => {
    if (!name || !scope) return;
    scope.registerRules(name, rules);
    return () => scope.registerRules(name, undefined);
    // The rules object arrives fresh from the props bag on every push, so it is
    // compared by content rather than identity; otherwise this re-registers on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, scope, JSON.stringify(rules ?? null)]);

  const hit = name ? lookup(scope, name) : { found: false as const };
  const value = hit.found ? fromScope(hit.value) : local;

  const set = useCallback(
    (next: T) => {
      if (name && write(scope, name, toScope(next))) return;
      setLocal(next);
    },
    [name, scope, toScope],
  );

  return [value, set];
}

/** The rejection currently standing against a field, if any. */
export function useFieldError(name: string | undefined): string {
  const scope = useContext(ScopeContext);
  if (!name || !scope) return "";
  return scope.errors[name] ?? "";
}

/**
 * Whether a node should render at all.
 *
 * `visibleWhen` is a predicate over the scope's values rather than a prop of its
 * own — a "show this when that field is set" flag answers one screen and earns a
 * second flag for the next one. An absent condition means visible; an unreadable
 * one means hidden, because a control shown because its rule could not be read
 * is the fail-open case.
 */
export function useVisible(condition: Predicate | undefined): boolean {
  const scope = useContext(ScopeContext);
  if (condition === undefined) return true;
  const values: Record<string, unknown> = {};
  for (let s = scope; s; s = s.parent) {
    for (const name of Object.keys(s.vars)) {
      if (!(name in values) && name in s.values) values[name] = s.values[name];
    }
  }
  return evaluate(condition, values);
}

/** The three coercions back out of a scope, matching the declared types. */
export const asString = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
export const asNumber = (fallback: number) => (v: unknown) => (typeof v === "number" ? v : fallback);
export const asBoolean = (v: unknown): boolean => v === true;
