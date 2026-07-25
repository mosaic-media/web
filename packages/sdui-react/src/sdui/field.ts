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

import { useCallback, useContext, useState } from "react";
import { ScopeContext, lookup, write } from "./scope";

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
): [T, (next: T) => void] {
  const scope = useContext(ScopeContext);
  const [local, setLocal] = useState<T>(initial);

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

/** The three coercions back out of a scope, matching the declared types. */
export const asString = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
export const asNumber = (fallback: number) => (v: unknown) => (typeof v === "number" ? v : fallback);
export const asBoolean = (v: unknown): boolean => v === true;
