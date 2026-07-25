// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The six validators and the six predicates, client side (ADR 0089).
 *
 * Both sets are closed in the contract, and the closed-ness is load-bearing in
 * one direction: a validator is a rule the *server* states and this client
 * enforces, so an open set would let the server name something no client
 * implements, and the field would accept anything with no symptom until the bad
 * data surfaced elsewhere.
 *
 * This client's copy is not a trust boundary — the server enforces everything
 * again. What it buys is the round trip: a field that is obviously wrong says so
 * before anything is sent. When the server rejects something this client could
 * not have known, it answers in the same shape (FieldErrors), so a rejection
 * from either side renders in the same place.
 */

/** One field's rules, as they ride the props bag. */
export type RuleSet = Record<string, unknown>;

/** A condition over scope values. */
export type Predicate = Record<string, unknown>;

const asText = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
};

// Fixed order, not object order: the same bad value must produce the same
// message every time, and "Required" is the one a person can act on, so it wins
// over "too short".
const ORDER = ["required", "minLength", "maxLength", "pattern", "matches", "oneOf"] as const;

export { VALIDATORS, PREDICATES } from "./native";

/**
 * Apply a field's rules to its value, returning the first failure.
 *
 * `values` is the rest of the scope, which `matches` needs and nothing else
 * reads.
 */
export function validateField(value: unknown, rules: RuleSet | undefined, values: Record<string, unknown>): string {
  if (!rules) return "";
  const s = asText(value);
  for (const name of ORDER) {
    if (!(name in rules)) continue;
    const arg = rules[name];
    switch (name) {
      case "required":
        if (arg === true && s.trim() === "") return "Required";
        break;
      case "minLength":
        if (typeof arg === "number" && [...s].length < arg) return `Must be at least ${arg} characters`;
        break;
      case "maxLength":
        if (typeof arg === "number" && [...s].length > arg) return `Must be at most ${arg} characters`;
        break;
      case "pattern": {
        // An empty value is `required`'s business; otherwise every optional
        // patterned field would be effectively required.
        if (typeof arg !== "string" || arg === "" || s === "") break;
        let re: RegExp;
        try {
          re = new RegExp(arg);
        } catch {
          // A pattern that will not compile is the server's mistake, and
          // failing the field would blame the person typing for it.
          break;
        }
        if (!re.test(s)) return "Not in the expected format";
        break;
      }
      case "matches":
        if (typeof arg === "string" && arg !== "" && s !== asText(values[arg])) return `Does not match ${arg}`;
        break;
      case "oneOf":
        if (Array.isArray(arg) && arg.length > 0 && !arg.some((x) => asText(x) === s)) return "Not an allowed value";
        break;
    }
  }
  return "";
}

/**
 * Answer a predicate against a set of values.
 *
 * An unrecognised shape is **false**, never true. `visibleWhen` deciding to show
 * a control because it could not read its own rule is the fail-open case, and it
 * is the one that puts an admin-only affordance on somebody's screen.
 */
export function evaluate(p: Predicate | undefined, values: Record<string, unknown>): boolean {
  if (!p || typeof p !== "object") return false;

  if ("not" in p) {
    const inner = p.not;
    return isObj(inner) ? !evaluate(inner, values) : false;
  }
  if ("all" in p) {
    // A conjunction of nothing is true; a producer building a condition list may
    // legitimately end up with none.
    return Array.isArray(p.all) && p.all.every((x) => isObj(x) && evaluate(x, values));
  }
  if ("any" in p) {
    return Array.isArray(p.any) && p.any.some((x) => isObj(x) && evaluate(x, values));
  }

  const field = p.field;
  if (typeof field !== "string" || field === "") return false;
  const value = values[field];
  if ("equals" in p) return asText(value) === asText(p.equals);
  if ("notEmpty" in p) return p.notEmpty === (asText(value) !== "");
  if (Array.isArray(p.oneOf)) return p.oneOf.some((x) => asText(x) === asText(value));
  return false;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
