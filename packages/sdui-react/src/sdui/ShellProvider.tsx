// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * ShellProvider wires the runtime: it owns overlay + toast state, forwards
 * navigation to the host, and interprets every Action kind. It is the one place
 * that talks to the network, so components stay declarative.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Action, ActionResult, Tone, UINode } from "./types";
import { ShellRuntimeContext, type OverlayHandle } from "./context";

export interface ToastItem {
  id: string;
  message: string;
  tone: Tone;
}

interface ShellProviderProps {
  screen: string;
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
  onBack: () => void;
  children: ReactNode;
  /** Render prop for overlays/toasts so the host controls where they mount. */
  render: (ui: { overlays: OverlayHandle[]; toasts: ToastItem[]; dismissOverlay: () => void; dismissToast: (id: string) => void }) => ReactNode;
  /** The live session (ADR 0041). An Invoke action is sent up the session
   *  transport, and onInput streams a field value for search-as-you-type.
   *
   *  Both are optional because this runtime is also consumed outside a session —
   *  the storybook renders the same trees with nothing behind them. There is no
   *  longer a request/response fallback: since ADR 0061 the session transport is
   *  the only way a client reaches the Platform, so an invoke with no session is
   *  reported as such rather than quietly attempted over a second transport. */
  onInvoke?: (mutation: string, input?: Record<string, unknown>) => void;
  onInput?: (value: string) => void;
}

let seq = 0;
const nextId = (p: string) => `${p}-${++seq}`;

export function ShellProvider({ screen, onNavigate, onBack, children, render, onInvoke, onInput }: ShellProviderProps) {
  const [overlays, setOverlays] = useState<OverlayHandle[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, tone: Tone = "neutral") => {
    const id = nextId("toast");
    setToasts((t) => [...t, { id, message, tone }]);
    // Auto-dismiss; reduced-motion users still get the removal.
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const dismissOverlay = useCallback(() => {
    setOverlays((o) => o.slice(0, -1));
  }, []);

  const dispatch = useCallback(
    async (action: Action): Promise<ActionResult> => {
      switch (action.kind) {
        case "navigate":
          onNavigate(action.screen, action.params);
          return { ok: true };

        case "back":
          onBack();
          return { ok: true };

        case "openUrl": {
          // Only allow http(s) — never interpret server-supplied javascript: etc.
          try {
            const u = new URL(action.url);
            if (u.protocol === "http:" || u.protocol === "https:") {
              window.open(u.href, "_blank", "noopener,noreferrer");
              return { ok: true };
            }
          } catch {
            /* fall through */
          }
          pushToast("Blocked an unsafe link.", "warning");
          return { ok: false, error: { category: "InvalidArgument", message: "Unsafe URL" } };
        }

        case "openOverlay": {
          const handle: OverlayHandle = {
            id: nextId("overlay"),
            surface: action.surface ?? "modal",
            node: action.node as UINode,
          };
          setOverlays((o) => [...o, handle]);
          return { ok: true };
        }

        case "closeOverlay":
          dismissOverlay();
          return { ok: true };

        case "toast":
          pushToast(action.message, action.tone ?? "neutral");
          return { ok: true };

        case "playPart":
          // Playback resolution is a future module (Remote Media). For the
          // skeleton we acknowledge the intent.
          pushToast(`Play requested for part ${action.partId}`, "accent");
          return { ok: true };

        case "invoke": {
          // Hand the action to the session transport; the server runs it and
          // pushes what it produced (a toast, a re-render, a player) on the push
          // lane. Nothing comes back through this return value by design — the
          // Ack carries no payload (ADR 0041).
          if (!onInvoke) {
            const message = "Not connected to a Platform session.";
            pushToast(message, "danger");
            return { ok: false, error: { category: "Unavailable", message } };
          }
          onInvoke(action.mutation, action.input);
          return { ok: true };
        }

        case "sequence": {
          let last: ActionResult = { ok: true };
          for (const a of action.actions) {
            last = await dispatch(a);
            if (!last.ok) break;
          }
          return last;
        }

        default:
          return { ok: false, error: { category: "InvalidArgument", message: "Unknown action" } };
      }
    },
    [onNavigate, onBack, dismissOverlay, pushToast, onInvoke],
  );

  const emit = useCallback(
    (action?: Action) => {
      if (action) void dispatch(action);
    },
    [dispatch],
  );

  const runtime = useMemo(() => ({ dispatch, emit, screen, input: onInput }), [dispatch, emit, screen, onInput]);

  return (
    <ShellRuntimeContext.Provider value={runtime}>
      {children}
      {render({ overlays, toasts, dismissOverlay, dismissToast })}
    </ShellRuntimeContext.Provider>
  );
}
