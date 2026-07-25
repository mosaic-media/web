// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * State scopes: named variables a subtree binds to and writes (ADR 0087).
 *
 * A tree describes one moment. Something has to remember what was typed between
 * two of them, and until now nothing did — a TextInput held its value in this
 * client's own component state, where no other node could read it, and the only
 * way out was SubmitField substituting "$value" into an action, one field at a
 * time. That is why no screen could carry two inputs.
 *
 * A scope is a link in a chain, not a flat map. A binding resolves against the
 * nearest enclosing scope that *declares* the name, then outward, and finally
 * against the screen's params. Declares, not holds: a scope that merely happened
 * to have a value would capture a name it was never given, so the declaration is
 * what makes a name belong to a scope, and an undeclared write is refused rather
 * than creating a variable nobody reads.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/** One variable as the contract declares it. */
export interface StateVar {
  name: string;
  type: "string" | "number" | "boolean";
  value?: unknown;
}

/** A scope and its enclosing chain. */
export interface Scope {
  /** The names this scope declares, and their types. */
  vars: Record<string, StateVar>;
  /** Current values, by name. */
  values: Record<string, unknown>;
  /** Write a declared name. Returns false if this scope does not declare it,
   *  so the caller can walk outward. */
  set: (name: string, raw: string) => boolean;
  parent: Scope | null;
}

export const ScopeContext = createContext<Scope | null>(null);

/**
 * Look a name up through the scope chain, nearest first.
 *
 * Returns `found: false` rather than `undefined` so a variable that genuinely
 * holds undefined is distinguishable from one no scope declares — the caller
 * then falls through to the screen params instead of stopping at a value that
 * was never there.
 */
export function lookup(scope: Scope | null, name: string): { found: boolean; value?: unknown } {
  for (let s = scope; s; s = s.parent) {
    if (name in s.vars) return { found: true, value: s.values[name] };
  }
  return { found: false };
}

/** Write a name into the nearest scope that declares it. Returns false when no
 *  scope does — an undeclared write is a refusal, not a new variable. */
export function write(scope: Scope | null, name: string, raw: string): boolean {
  for (let s = scope; s; s = s.parent) {
    if (s.set(name, raw)) return true;
  }
  return false;
}

/**
 * Coerce a written value to its declared type.
 *
 * setValue carries a string on the wire — one field on the Action, rather than a
 * type union that every client would have to agree about — so the declared type
 * is what says how to read it. A number that will not parse is left alone rather
 * than becoming NaN, which renders as the word "NaN" and looks like a bug in the
 * screen rather than in the value.
 */
export function coerce(raw: string, type: StateVar["type"]): unknown {
  switch (type) {
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    case "boolean":
      return raw === "true" || raw === "1";
    default:
      return raw;
  }
}

/** StateScope — the runtime behind the State primitive. */
export function StateScope({ vars, children }: { vars: StateVar[]; children: ReactNode }) {
  const parent = useContext(ScopeContext);

  const declared = useMemo(() => {
    const out: Record<string, StateVar> = {};
    for (const v of vars) {
      if (v && typeof v.name === "string" && v.name) out[v.name] = v;
    }
    return out;
  }, [vars]);

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const v of Object.values(declared)) {
      // An absent initial value stays absent. A number with no initial value is
      // unset, and inventing 0 for it is a slider that jumps to zero on first
      // render.
      if (v.value !== undefined) out[v.name] = v.value;
    }
    return out;
  });

  // The declarations are read inside `set` without being a dependency of it: a
  // callback that changed identity whenever the server re-sent the same vars
  // would re-render every consumer of this scope on every push.
  const declaredRef = useRef(declared);
  declaredRef.current = declared;

  const set = useCallback((name: string, raw: string) => {
    const v = declaredRef.current[name];
    if (!v) return false;
    const next = coerce(raw, v.type);
    if (next === undefined) return true; // declared, but the value would not parse
    setValues((prev) => (prev[name] === next ? prev : { ...prev, [name]: next }));
    return true;
  }, []);

  const scope = useMemo<Scope>(() => ({ vars: declared, values, set, parent }), [declared, values, set, parent]);

  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}
