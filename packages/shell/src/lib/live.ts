// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The live session client (ADR 0041): the two-lane Connect transport to the
 * Platform's SessionService. Intents (attach / navigate / invoke / input) are
 * unary calls; UI updates arrive on one long-lived server-streaming Subscribe.
 * The Shell owns the connection; the SDUI runtime dispatches intents through it.
 *
 * Two lanes over one connection (ADR 0041): a unary intent returns only an Ack —
 * its visible effect (a re-rendered region, a toast) arrives on the push lane.
 * Subscribe carries ServerMessages, each with a monotonic seq that doubles as
 * the resume cursor: on reconnect we re-Subscribe with the last seq we saw so the
 * server replays what we missed (ADR 0033's handover, folded into resume).
 *
 * Resilience is client-owned, because you cannot push to a dead stream: on a drop
 * the client reconnects with exponential backoff + jitter (a Supervisor rolling
 * upgrade drops many clients at once — jitter spreads their retries). On every
 * (re)open onOpen fires, and the Shell re-Attaches the current route so the
 * Platform — whose live-session state is disposable — re-renders exactly what was
 * showing. The auth session is DB-backed, so it survives a Platform restart.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { defineComponents, type ToastItem, type Tone, type UINode } from "@mosaic-media/sdui-react";
import { createClient, type Client } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { traceInterceptor, currentTraceId } from "./trace";
import {
  SessionService,
  RegionUpdate_Op,
  type RegionUpdate,
  type ServerMessage,
} from "@mosaic-media/sdui/session";
import type { NodeList, UINode as WireNode } from "@mosaic-media/sdui/sdui-pb";

export type LiveStatus = "connecting" | "open" | "reconnecting" | "closed";

/** An intent the Shell streams up the unary lane. */
export type Intent =
  | { kind: "attach"; screen: string; params?: Record<string, unknown> }
  | { kind: "navigate"; screen: string; params?: Record<string, unknown> }
  | { kind: "invoke"; action: string; input?: Record<string, unknown> }
  | { kind: "input"; value: string };

export interface Live {
  status: LiveStatus;
  /** The app shell tree (ShellUpdate), or null until the first push. */
  shell: UINode | null;
  /** The pushed regions by name (ADR 0029/0031); the primary one is "content". */
  regions: Record<string, UINode[]>;
  toasts: ToastItem[];
  send: (intent: Intent) => void;
  /** True between sending an intent and the server pushing its result.
   *
   * The transport is deliberately asymmetric (ADR 0041): an intent is a unary
   * call that Acks immediately, and its *visible* effect arrives later on the
   * push lane. That leaves a gap in which the UI has been told nothing, and a
   * two-second gap with no feedback is indistinguishable from a click that did
   * not register — which is why it gets clicked again, or the page refreshed. */
  pending: boolean;
  dismissToast: (id: string) => void;
}

interface LiveOptions {
  /** Called on every (re)open with a live send. The Shell uses it to re-Attach
   *  the current route so the server re-renders it. */
  onOpen?: (send: (intent: Intent) => void) => void;
}

// Full-jitter backoff: the delay is a random point in [0, cap], cap doubling each
// attempt up to the ceiling.
const BACKOFF_BASE = 300;
const BACKOFF_CEIL = 10_000;

let toastSeq = 0;

// Same-origin in dev (Vite proxies the SessionService path to the Platform);
// override with VITE_PLATFORM_URL to point at a Platform directly.
const transport = createConnectTransport({
  baseUrl: import.meta.env.VITE_PLATFORM_URL ?? window.location.origin,
  // Every call carries a freshly minted W3C traceparent (ADR 0054). The
  // Platform continues that trace rather than starting its own, so a click
  // here and the database write it causes share one id — which is what makes a
  // failure that crosses repositories a lookup instead of an investigation.
  interceptors: [traceInterceptor],
});

const encoder = new TextEncoder();
const jsonBytes = (v: Record<string, unknown> | undefined): Uint8Array =>
  encoder.encode(JSON.stringify(v ?? {}));

// toStructural converts the wire protobuf UINode into the runtime's structural
// UINode, unwrapping each slot's NodeList (protobuf maps cannot hold `repeated`,
// so slots is map<string, NodeList> on the wire — ADR 0044). props already
// arrives as a plain object (google.protobuf.Struct).
function toStructural(n: WireNode): UINode {
  const out: UINode = { type: n.type };
  if (n.id) out.id = n.id;
  if (n.props) out.props = n.props as Record<string, unknown>;
  if (n.children.length > 0) out.children = n.children.map(toStructural);
  const slotKeys = Object.keys(n.slots);
  if (slotKeys.length > 0) {
    const slots: Record<string, UINode[]> = {};
    for (const key of slotKeys) {
      slots[key] = (n.slots[key] as NodeList).nodes.map(toStructural);
    }
    out.slots = slots;
  }
  return out;
}

/** Opens the live session once the session id is known, exposing the pushed
 *  shell/regions and a way to stream intents up. Reconnects automatically with
 *  resume. */
export function useLive(session: string | null, options: LiveOptions = {}): Live {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  // Counted rather than boolean: two intents can be in flight at once (a
  // navigate while a search is still resolving), and a flag would clear on the
  // first reply and hide the second.
  const [inFlight, setInFlight] = useState(0);
  const [shell, setShell] = useState<UINode | null>(null);
  const [regions, setRegions] = useState<Record<string, UINode[]>>({});
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Keep the latest onOpen in a ref so the connect loop's identity does not
  // depend on it — the stream must not tear down when the callback changes.
  const onOpenRef = useRef(options.onOpen);
  onOpenRef.current = options.onOpen;

  // send is stable; it forwards to the current connection's dispatcher.
  const sendRef = useRef<(intent: Intent) => void>(() => {});
  const send = useCallback((intent: Intent) => {
    // Attach is bookkeeping rather than a user action — counting it would show a
    // spinner on every reconnect, including ones nobody asked for.
    if (intent.kind !== "attach") setInFlight((n) => n + 1);
    sendRef.current(intent);
  }, []);

  const pushToast = useCallback((message: string, tone: Tone) => {
    const id = `toast-${++toastSeq}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  useEffect(() => {
    if (!session) return;

    const client: Client<typeof SessionService> = createClient(SessionService, transport);
    const abort = new AbortController();
    let disposed = false;
    let attempt = 0;
    let cursor = 0n; // last seq seen — the resume cursor.
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    sendRef.current = (intent) => void runIntent(client, session, intent, abort.signal);

    const applyRegion = (u: RegionUpdate) => {
      const node = u.uiNode ? toStructural(u.uiNode) : null;
      setRegions((prev) => {
        const cur = prev[u.region] ?? [];
        let next: UINode[];
        switch (u.op) {
          case RegionUpdate_Op.REPLACE:
            next = node ? [node] : [];
            break;
          case RegionUpdate_Op.APPEND:
            next = node ? [...cur, node] : cur;
            break;
          case RegionUpdate_Op.PREPEND:
            next = node ? [node, ...cur] : cur;
            break;
          case RegionUpdate_Op.REMOVE:
            next = node ? cur.filter((n) => n.id !== node.id) : cur;
            break;
          case RegionUpdate_Op.PATCH:
            next = node ? cur.map((n) => (n.id === node.id ? node : n)) : cur;
            break;
          default:
            next = cur;
        }
        return { ...prev, [u.region]: next };
      });
    };

    const apply = (msg: ServerMessage) => {
      // A bodyless message is the server's keepalive: it exists to stop an idle
      // connection being reaped by a proxy, and carries nothing to render.
      if (!msg.body.case) return;

      // Anything the server pushes is the visible result of something, so it
      // ends the pending state. Clamped at zero because a push can arrive
      // without a matching intent — the connect burst, or a server-initiated
      // update — and a counter that went negative would swallow the next real
      // one.
      setInFlight((n) => (n > 0 ? n - 1 : 0));

      switch (msg.body.case) {
        case "shell":
          setShell(msg.body.value.uiNode ? toStructural(msg.body.value.uiNode) : null);
          break;
        case "region":
          applyRegion(msg.body.value);
          break;
        case "toast":
          pushToast(msg.body.value.message, (msg.body.value.tone || "neutral") as Tone);
          break;
        case "event": {
          const ev = msg.body.value;
          // The Platform pushes the SDUI component-definition library (ADR 0024)
          // on connect, before the shell, as a JSON array of ComponentDefinition.
          // Registering it here makes the design system server-owned: the client
          // ships only primitives + the expander and renders whatever the
          // Platform defines. It arrives before any screen that references it, so
          // registration lands before the first render. Other event types
          // (import finished, cross-device edit) are reserved.
          if (ev.type === "sdui.definitions") {
            try {
              defineComponents(JSON.parse(new TextDecoder().decode(ev.payload)));
            } catch {
              // A malformed library leaves the bundled fallback definitions in
              // place rather than breaking the render.
            }
          }
          break;
        }
      }
    };

    const connect = async () => {
      if (disposed) return;
      setStatus((prev) => (prev === "open" || attempt > 0 ? "reconnecting" : "connecting"));
      let opened = false;
      try {
        const stream = client.subscribe(
          { session, resumeCursor: cursor },
          { signal: abort.signal },
        );
        for await (const msg of stream) {
          if (disposed) return;
          if (!opened) {
            opened = true;
            attempt = 0;
            setStatus("open");
            onOpenRef.current?.(send);
          }
          cursor = msg.seq;
          apply(msg);
        }
      } catch {
        if (disposed) return;
        // A drop (server going away, restart, network) is expected — fall through
        // to a backoff reconnect rather than surfacing an error.
      }
      if (disposed) return;
      setStatus("reconnecting");
      const cap = Math.min(BACKOFF_CEIL, BACKOFF_BASE * 2 ** attempt);
      attempt += 1;
      retryTimer = setTimeout(() => void connect(), Math.random() * cap);
    };

    void connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      abort.abort();
      sendRef.current = () => {};
    };
  }, [session, pushToast, send]);

  return { status, shell, regions, toasts, send, dismissToast, pending: inFlight > 0 };
}

// runIntent maps a Shell intent onto the matching unary RPC. Params/input ride as
// a JSON object in `bytes` (open, screen-/action-specific bags — ADR 0041).
async function runIntent(
  client: Client<typeof SessionService>,
  session: string,
  intent: Intent,
  signal: AbortSignal,
) {
  try {
    switch (intent.kind) {
      case "attach":
        await client.attach(
          { session, screen: intent.screen, params: jsonBytes(intent.params) },
          { signal },
        );
        break;
      case "navigate":
        await client.navigate(
          { session, screen: intent.screen, params: jsonBytes(intent.params) },
          { signal },
        );
        break;
      case "invoke":
        await client.invoke(
          { session, action: intent.action, input: jsonBytes(intent.input) },
          { signal },
        );
        break;
      case "input":
        await client.submitInput({ session, value: intent.value }, { signal });
        break;
    }
  } catch (err) {
    // An intent either succeeds (Ack) or fails; its visible effect arrives on the
    // push lane. A failed/aborted intent is swallowed here — the stream is the
    // source of truth, so we do not throw into React.
    //
    // Swallowed is not the same as unrecorded, though. The trace id is written
    // to the console so a failure a user can see but not describe becomes one
    // string they can quote, and that string joins this click to the Platform's
    // own records of what it did with it (ADR 0054).
    if (!signal.aborted) {
      console.warn(`mosaic: intent "${intent.kind}" failed (trace ${currentTraceId()})`, err);
    }
  }
}
