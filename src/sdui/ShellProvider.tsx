/*
 * ShellProvider wires the runtime: it owns overlay + toast state, forwards
 * navigation to the host, and interprets every Action kind. It is the one place
 * that talks to the network, so components stay declarative.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Action, ActionResult, Tone, UINode } from "./types";
import { ShellRuntimeContext, type OverlayHandle } from "./context";
import { gql, PlatformError } from "@/lib/platform";

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
}

let seq = 0;
const nextId = (p: string) => `${p}-${++seq}`;

export function ShellProvider({ screen, onNavigate, onBack, children, render }: ShellProviderProps) {
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

        case "invoke":
        case "query": {
          const document =
            action.kind === "invoke"
              ? `mutation Shell($input: JSON) { ${action.mutation}(input: $input) }`
              : action.query;
          const variables = action.kind === "invoke" ? { input: action.input } : action.variables;
          try {
            const data = await gql(document, variables);
            return { ok: true, data };
          } catch (e) {
            const err =
              e instanceof PlatformError
                ? { category: e.category, message: e.message }
                : ({ category: "Internal", message: "Unexpected error" } as const);
            pushToast(err.message, "danger");
            return { ok: false, error: err };
          }
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
    [onNavigate, onBack, dismissOverlay, pushToast],
  );

  const emit = useCallback(
    (action?: Action) => {
      if (action) void dispatch(action);
    },
    [dispatch],
  );

  const runtime = useMemo(() => ({ dispatch, emit, screen }), [dispatch, emit, screen]);

  return (
    <ShellRuntimeContext.Provider value={runtime}>
      {children}
      {render({ overlays, toasts, dismissOverlay, dismissToast })}
    </ShellRuntimeContext.Provider>
  );
}
