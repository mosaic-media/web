// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Runtime context handed to every rendered component: how to dispatch actions,
 * and access to whatever ambient services the Shell provides (navigation,
 * overlays, toasts). Components stay pure — they emit Actions, they don't reach
 * for the network themselves.
 */

import { createContext, useContext } from "react";
import type { Action, ActionResult, UINode } from "./types";

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
  /** Stream a field value up as it changes (search-as-you-type). Present only
   *  in a live session (ADR 0032); absent otherwise, so a component falls back
   *  to submit-on-enter. */
  input?: (value: string) => void;
}

export const ShellRuntimeContext = createContext<ShellRuntime | null>(null);

export function useRuntime(): ShellRuntime {
  const ctx = useContext(ShellRuntimeContext);
  if (!ctx) {
    throw new Error("useRuntime must be used within a <ShellProvider>");
  }
  return ctx;
}
