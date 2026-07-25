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
import { ScopeContext, write, type Scope } from "./scope";

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
  /** The params the current screen was navigated with — the scope a prop
   *  binding resolves against. Absent outside a live session (the storybook),
   *  where a binding simply resolves to nothing. */
  params?: Record<string, unknown>;
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
