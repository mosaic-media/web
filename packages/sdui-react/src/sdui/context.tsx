// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Runtime context handed to every rendered component: how to dispatch actions,
 * and access to whatever ambient services the Shell provides (navigation,
 * overlays, toasts). Components stay pure — they emit Actions, they don't reach
 * for the network themselves.
 */

import { createContext, useCallback, useContext } from "react";
import type { Action, ActionResult, UINode } from "./types";
import { ScopeContext, write, collect, type Scope } from "./scope";
import { validateField } from "./validate";

export interface OverlayHandle {
  id: string;
  surface: "modal" | "sheet" | "drawer";
  node: UINode;
}

export interface ShellRuntime {
  /** Interpret an action envelope. Network kinds resolve asynchronously. */
  dispatch: (action: Action) => Promise<ActionResult>;
  /** Convenience for the very common onClick case. */
  emit: (action?: Action) => void;
  /** Current screen name, for highlighting nav. */
  screen: string;
  /** Re-read a screen without pushing history (the `query` action kind). Absent
   *  outside a live session, where a re-read has nothing to re-read from. */
  onQuery?: (screen: string, params?: Record<string, unknown>) => void;
  /** The params the current screen was navigated with — the scope a prop
   *  binding resolves against. Absent outside a live session (the storybook),
   *  where a binding simply resolves to nothing. */
  params?: Record<string, unknown>;
  /** A submission the server rejected, by field name (ADR 0089). It is the
   *  same shape this client's own validators produce, so a rejection from
   *  either side renders in the same place — which is the whole reason the
   *  envelope is symmetric. */
  fieldErrors?: { errors: Record<string, string>; formError?: string };
  /** Stream a field value up as it changes (search-as-you-type). Present only
   *  in a live session (ADR 0032); absent otherwise, so a component falls back
   *  to submit-on-enter. */
  input?: (value: string) => void;
}

export const ShellRuntimeContext = createContext<ShellRuntime | null>(null);

/**
 * The runtime as seen from *this* point in the tree.
 *
 * setValue is handled here rather than in ShellProvider because it is the one
 * action whose meaning depends on where it was emitted: "the nearest enclosing
 * scope that declares this field" is a question only the component that emitted
 * it can answer. Everything else is position-independent and is delegated.
 *
 * A sequence is walked here too, so a setValue nested inside one still resolves
 * against the emitting component's scope rather than against nothing.
 */
export function useRuntime(): ShellRuntime {
  const ctx = useContext(ShellRuntimeContext);
  const scope = useContext(ScopeContext);
  if (!ctx) {
    throw new Error("useRuntime must be used within a <ShellProvider>");
  }
  return useScopedRuntime(ctx, scope);
}

function useScopedRuntime(ctx: ShellRuntime, scope: Scope | null): ShellRuntime {
  const dispatch = useCallback(
    async (action: Action): Promise<ActionResult> => {
      if (action.kind === "setValue") {
        if (!write(scope, action.field, action.value)) {
          // Refused rather than silently creating a variable nobody reads. A
          // write to a name no enclosing scope declares is a typo or a control
          // outside the scope it thinks it is in, and both are worth a message.
          return {
            ok: false,
            error: { category: "InvalidArgument", message: `No enclosing State scope declares "${action.field}"` },
          };
        }
        return { ok: true };
      }
      if (action.kind === "submit") {
        const inner = action.actions[0];
        if (!inner) return { ok: false, error: { category: "InvalidArgument", message: "submit carries no action" } };
        const values = collect(scope);

        // Enforce this client's copy of the rules before anything is sent. Not a
        // trust boundary — the server checks again — but it is the difference
        // between a field that says it is wrong and a round trip that comes back
        // saying so.
        //
        // Every registered field is checked, including ones not on screen: a
        // conditionally hidden required field would otherwise pass by not being
        // rendered.
        if (scope) {
          const errors: Record<string, string> = {};
          let bad = false;
          for (const [field, rules] of Object.entries(scope.rules)) {
            const message = validateField(values[field], rules, values);
            errors[field] = message;
            if (message) bad = true;
          }
          scope.setErrors(errors);
          if (bad) {
            return { ok: false, error: { category: "InvalidArgument", message: "Some fields need attention" } };
          }
        }
        // Merged under whatever the producer set, not over it. A server that
        // pinned a field in the action's input is stating something the form is
        // not allowed to overwrite.
        const merged =
          inner.kind === "invoke"
            ? { ...inner, input: { ...values, ...(inner.input ?? {}) } }
            : inner;
        return dispatch(merged);
      }
      if (action.kind === "sequence") {
        let last: ActionResult = { ok: true };
        for (const a of action.actions) {
          last = await dispatch(a);
          if (!last.ok) break;
        }
        return last;
      }
      return ctx.dispatch(action);
    },
    [ctx, scope],
  );
  const emit = useCallback((action?: Action) => { if (action) void dispatch(action); }, [dispatch]);
  return { ...ctx, dispatch, emit };
}
