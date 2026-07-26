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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
  /** The rules each field registered when it mounted. Registered rather than
   *  declared on the variable, because the rules belong next to the control that
   *  states them — and collected here, because submitting has to check fields
   *  that may not be on screen. */
  rules: Record<string, Record<string, unknown>>;
  registerRules: (name: string, rules: Record<string, unknown> | undefined) => void;
  /** The current rejection for each field, from this client's validators or
   *  from the server's — the same shape either way, which is the point. */
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
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

/** The scope variable a pushed form-level error is written into. One name,
 *  spelled here, so the client and every producer agree on it. */
export const formErrorVar = "formError";

/** StateScope — the runtime behind the State primitive. */
export function StateScope({
  vars,
  pushedErrors,
  pushedFormError,
  children,
}: {
  vars: StateVar[];
  /** A rejection the server pushed, by field. Handed in rather than read from
   *  the runtime context here: this module is imported *by* the runtime's own
   *  module, and reaching back for it made a cycle in which whichever module
   *  evaluated second saw `undefined` — so `useContext(undefined)` threw in
   *  whatever component happened to render first. */
  pushedErrors?: Record<string, string>;
  /** A rejection that belongs to the submission rather than to any one field —
   *  a wrong password, two fields that conflict, a service that was down.
   *
   *  It lands in the scope variable named `formError`, when one is declared,
   *  and nowhere otherwise. That is a convention rather than a mechanism, and
   *  it is the one that keeps the *placement* on the server: a producer that
   *  wants the message shown binds some node's text to `formError` and decides
   *  where it goes, exactly as it decides everything else about the tree. The
   *  alternative — this client drawing the message itself — would be the
   *  hand-written UI the whole SDUI thesis exists to prevent, and it would put
   *  the one sentence a refused sign-in shows in the one file no designer can
   *  reach.
   *
   *  A form that declares no such variable shows nothing, which is a screen
   *  that did not ask to be told. */
  pushedFormError?: string;
  children: ReactNode;
}) {
  const parent = useContext(ScopeContext);

  const declared = useMemo(() => {
    const out: Record<string, StateVar> = {};
    for (const v of vars) {
      if (v && typeof v.name === "string" && v.name) out[v.name] = v;
    }
    return out;
  }, [vars]);

  const [errors, setErrorsState] = useState<Record<string, string>>({});
  const rulesRef = useRef<Record<string, Record<string, unknown>>>({});
  const registerRules = useCallback((name: string, r: Record<string, unknown> | undefined) => {
    if (r) rulesRef.current[name] = r;
    else delete rulesRef.current[name];
  }, []);

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
    // Editing a field clears its rejection. Leaving it up while the value
    // changes underneath is a message about something that is no longer true.
    setErrorsState((prev) => (prev[name] === undefined ? prev : { ...prev, [name]: "" }));
    return true;
  }, []);

  // A rejection the server pushed lands on the fields it names, in the scope
  // that declares them. A name no scope declares is not silently dropped — the
  // Shell renders it as a form-level message — because a rejection nobody can
  // see is worse than one in the wrong place.
  const pushed = pushedErrors;
  useEffect(() => {
    if (!pushed) return;
    const mine: Record<string, string> = {};
    let any = false;
    for (const [field, message] of Object.entries(pushed)) {
      if (field in declaredRef.current) {
        mine[field] = message;
        any = true;
      }
    }
    if (any) setErrorsState((prev) => ({ ...prev, ...mine }));
  }, [pushed]);

  // The form-level message, into the variable a producer said to put it in.
  // Written as a value rather than as an error because it is one: the tree
  // binds it wherever it wants it drawn, and a value is the only thing a
  // binding can resolve.
  useEffect(() => {
    if (!(formErrorVar in declaredRef.current)) return;
    setValues((prev) =>
      prev[formErrorVar] === (pushedFormError ?? "") ? prev : { ...prev, [formErrorVar]: pushedFormError ?? "" },
    );
  }, [pushedFormError]);

  const scope = useMemo<Scope>(
    () => ({ vars: declared, values, rules: rulesRef.current, registerRules, errors, setErrors: setErrorsState, set, parent }),
    [declared, values, registerRules, errors, set, parent],
  );

  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

/**
 * Every value the scope chain declares, nearest scope winning.
 *
 * Nearest wins because that is how the chain resolves everywhere else, and a
 * submit that collected an outer scope's value for a name an inner one redeclared
 * would send something no control on the screen was showing.
 *
 * Only *declared* names are collected, and only those that hold a value: an
 * untouched variable with no initial value is absent from the payload rather
 * than being sent as an empty string, so a server can tell "left blank" from
 * "cleared".
 */
export function collect(scope: Scope | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (let s = scope; s; s = s.parent) {
    for (const name of Object.keys(s.vars)) {
      if (seen.has(name)) continue;
      seen.add(name);
      if (name in s.values) out[name] = s.values[name];
    }
  }
  return out;
}
