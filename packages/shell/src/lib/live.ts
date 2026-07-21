// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The live session client (ADR 0032): one WebSocket to the Platform. It sends
 * intents (navigate / input / invoke) and receives UI updates (shell / render a
 * region / toast). The Shell owns the socket; the SDUI runtime dispatches
 * through it.
 *
 * Resilience is client-owned, because you cannot push to a dead socket: on a
 * drop the client reconnects with exponential backoff + jitter (a Supervisor
 * rolling upgrade drops many clients at once — jitter spreads their retries).
 * On every (re)open it re-sends hello and calls onOpen, which re-declares the
 * current route so the Platform — whose live-session state is disposable —
 * re-renders the exact screen that was showing. The auth session is DB-backed,
 * so it survives a Platform restart and the reconnect just resumes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastItem, Tone, UINode } from "@mosaic-media/sdui-react";

export type LiveStatus = "connecting" | "open" | "reconnecting" | "closed";

interface Live {
  status: LiveStatus;
  shell: UINode | null;
  content: UINode | null;
  toasts: ToastItem[];
  send: (intent: Record<string, unknown>) => void;
  dismissToast: (id: string) => void;
}

interface LiveOptions {
  /** Called after hello on every (re)open, with a live send. The Shell uses it
   *  to re-declare the current route so the server re-renders it. */
  onOpen?: (send: (intent: Record<string, unknown>) => void) => void;
}

// Backoff bounds for reconnection. Full-jitter: the actual delay is a random
// point in [0, cap], where cap doubles each attempt up to the ceiling.
const BACKOFF_BASE = 300;
const BACKOFF_CEIL = 10_000;

let seq = 0;

/** Opens the live session once the session id is known, exposing the pushed
 *  shell/content and a way to stream intents up. Reconnects automatically. */
export function useLive(session: string | null, options: LiveOptions = {}): Live {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [shell, setShell] = useState<UINode | null>(null);
  const [content, setContent] = useState<UINode | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Keep the latest onOpen in a ref so the connect loop's identity does not
  // depend on it — the socket must not tear down when the callback changes.
  const onOpenRef = useRef(options.onOpen);
  onOpenRef.current = options.onOpen;

  const pushToast = useCallback((message: string, tone: Tone) => {
    const id = `toast-${++seq}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const send = useCallback((intent: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(intent));
  }, []);

  useEffect(() => {
    if (!session) return;

    let disposed = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (disposed) return;
      setStatus((prev) => (prev === "open" || attempt > 0 ? "reconnecting" : "connecting"));

      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setStatus("open");
        ws.send(JSON.stringify({ kind: "hello", session }));
        // Re-declare the current route so the server re-renders what was showing.
        onOpenRef.current?.(send);
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as { t: string; region?: string; node?: UINode; message?: string; tone?: Tone };
        if (msg.t === "shell") setShell(msg.node ?? null);
        else if (msg.t === "render" && msg.region === "content") setContent(msg.node ?? null);
        else if (msg.t === "toast") pushToast(msg.message ?? "", msg.tone ?? "neutral");
      };
      // A drop (server going away, restart, network) is expected: schedule a
      // reconnect with backoff + jitter rather than surfacing an error. onerror
      // is followed by onclose, so retry is scheduled from onclose alone.
      ws.onerror = () => {};
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (disposed) return;
        setStatus("reconnecting");
        const cap = Math.min(BACKOFF_CEIL, BACKOFF_BASE * 2 ** attempt);
        const delay = Math.random() * cap;
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      const ws = wsRef.current;
      wsRef.current = null;
      // Detach handlers so this socket's onclose does not schedule a reconnect
      // after we've disposed (e.g. session change / unmount).
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [session, pushToast, send]);

  return { status, shell, content, toasts, send, dismissToast };
}
