// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The Shell is a pure renderer over a live session (ADR 0031 + 0032). It signs
 * in, opens one WebSocket, and renders whatever the Platform pushes: the app
 * shell, and its content region. It streams intents up — navigate, search input
 * (as-you-type), invoke — and applies the pushed updates. It owns only the
 * connection, the browser-history mapping for its routes, a client-only Standby
 * state, and the SDUI runtime.
 *
 * Routes live in the URL (ADR 0032): a real navigate pushes history, a popstate
 * re-sends that entry's navigate, and search-as-you-type replaces the entry (no
 * spam). The current route is re-declared on every (re)connect so the Platform
 * re-renders the exact screen that was showing after a drop.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShellProvider, RenderNode, OverlayHost, ToastHost, refreshArtLight } from "@mosaic-media/sdui-react";
import type { UINode } from "@mosaic-media/sdui-react";
import { devSignIn } from "@/lib/session";
import { useLive, type Intent } from "@/lib/live";
import { routeFromLocation, routeToUrl, sameRoute, type Route } from "@/lib/history";

export function App() {
  const [session, setSession] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(() => routeFromLocation());

  // The current route, mirrored in a ref so the socket's on-open handler can
  // re-declare it without re-subscribing when the route changes.
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    refreshArtLight();
    // Seed the initial history entry so a popstate back to it carries the route.
    history.replaceState(routeRef.current, "", routeToUrl(routeRef.current));
  }, []);

  // Sign in once; the socket opens as soon as we have a session.
  useEffect(() => {
    let cancelled = false;
    devSignIn().then(
      (s) => !cancelled && setSession(s),
      (e: unknown) => !cancelled && setAuthError(e instanceof Error ? e.message : "Sign-in failed"),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // On every (re)connect, re-Attach the current route so the server re-renders
  // exactly what was showing (resume). Stable identity — reads the ref.
  const declareRoute = useCallback((send: (intent: Intent) => void) => {
    const r = routeRef.current;
    send({ kind: "attach", screen: r.screen, params: r.params });
  }, []);

  const { status, shell, regions, toasts, send, dismissToast, pending } = useLive(session, { onOpen: declareRoute });

  // A real navigation: record the route, push a history entry, tell the server.
  // pushState lives outside setRoute — a state updater must stay pure (React
  // StrictMode double-invokes it), and a duplicate route pushes no entry.
  const navigate = useCallback(
    (screenName: string, params?: Record<string, unknown>) => {
      const next: Route = params ? { screen: screenName, params } : { screen: screenName };
      if (!sameRoute(routeRef.current, next)) history.pushState(next, "", routeToUrl(next));
      routeRef.current = next;
      setRoute(next);
      send({ kind: "navigate", screen: screenName, params });
    },
    [send],
  );

  const onInvoke = useCallback(
    (mutation: string, input?: Record<string, unknown>) => send({ kind: "invoke", action: mutation, input }),
    [send],
  );

  // Search-as-you-type from the always-present top-bar search: stream the value
  // up. Search is a transient take-over of the content region, not a route — the
  // Platform renders results while typing and returns to the current screen when
  // the field clears, so the URL stays on whatever screen you were on.
  const onInput = useCallback(
    (value: string) => {
      send({ kind: "input", value });
    },
    [send],
  );

  // Back/forward: adopt the entry's route and re-render it over the socket. No
  // pushState — the browser already moved through history.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const r = (e.state as Route | null) ?? routeFromLocation();
      setRoute(r);
      send({ kind: "navigate", screen: r.screen, params: r.params });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [send]);

  // Fill the shell's regions with what the server pushed. The primary region is
  // "content"; keep an empty Fragment there until the first content push arrives
  // so the shell's content Outlet always has something to render.
  const composed = useMemo<UINode | null>(() => {
    if (!shell) return null;
    const slots: Record<string, UINode | UINode[]> = { ...(shell.slots ?? {}) };
    for (const [region, nodes] of Object.entries(regions)) {
      // The player is not a shell slot: it sits *over* the current context and
      // the screen beneath it must survive (ADR 0047). It is hosted separately,
      // below, rather than injected into a frame outlet.
      if (region === "player") continue;
      slots[region] = nodes;
    }
    if (!slots.content) slots.content = [{ type: "Fragment" }];
    return { ...shell, slots };
  }, [shell, regions]);

  // Dismissal is client-side: the server pushed a player, and closing it is a
  // local act rather than a state change worth a round trip. A newly pushed
  // player clears the flag, so playing something else re-opens the surface.
  const playerNodes = regions.player ?? [];
  const playerKey = playerNodes.length > 0 ? JSON.stringify(playerNodes[0]?.props ?? {}) : "";
  const [dismissedPlayer, setDismissedPlayer] = useState("");
  useEffect(() => {
    if (playerKey) setDismissedPlayer("");
  }, [playerKey]);
  const showPlayer = playerKey !== "" && dismissedPlayer !== playerKey;

  if (authError) return <Standby title="Can’t reach the Platform" message={authError} />;
  if (status !== "open" || !composed) {
    const reconnecting = status === "reconnecting";
    return (
      <Standby
        title={reconnecting ? "Reconnecting…" : "Connecting…"}
        message={
          reconnecting
            ? "Lost the connection to the Mosaic Platform. Retrying…"
            : "Opening a live session with the Mosaic Platform."
        }
      />
    );
  }

  return (
    <ShellProvider
      screen={route.screen}
      onNavigate={navigate}
      onBack={() => history.back()}
      onInvoke={onInvoke}
      onInput={onInput}
      render={({ overlays, dismissOverlay }) => (
        <>
          {pending && <PendingBar />}
          {showPlayer && (
            <PlayerHost
              nodes={playerNodes}
              title={String(playerNodes[0]?.props?.title ?? "")}
              onDismiss={() => setDismissedPlayer(playerKey)}
            />
          )}
          <OverlayHost overlays={overlays} onDismiss={dismissOverlay} />
          <ToastHost toasts={toasts} onDismiss={dismissToast} />
        </>
      )}
    >
      <RenderNode node={composed} />
    </ShellProvider>
  );
}

/** Standby — the Shell's only self-rendered UI (ADR 0031): shown when there is
 *  no live session to render from. Deliberately minimal — not a fake app. */
function Standby({ title, message }: { title: string; message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        height: "100vh",
        textAlign: "center",
        color: "var(--color-text, #e8e8ea)",
        background: "var(--color-bg, #0b0b0f)",
      }}
    >
      <img
        src={`${import.meta.env.BASE_URL}mosaic-icon-dark.png`}
        alt="Mosaic"
        width={44}
        height={44}
        style={{ opacity: 0.9 }}
      />
      <h1 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}>{title}</h1>
      <p style={{ opacity: 0.6, margin: 0, fontSize: "0.9rem" }}>{message}</p>
    </div>
  );
}

/** PlayerHost — the surface a pushed Player sits in (ADR 0047).
 *
 * The frame, the title bar and dismissal live here rather than in the Player
 * component, which renders only the mechanism the server named. Escape and a
 * backdrop click close it; the screen underneath was never torn down, so it is
 * still exactly where it was.
 */
function PlayerHost({
  nodes,
  title,
  onDismiss,
}: {
  nodes: UINode[];
  title: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div className="mos-player" role="dialog" aria-modal="true" aria-label={title || "Player"}>
      <div className="mos-player__backdrop" onClick={onDismiss} />
      <div className="mos-player__frame">
        <div className="mos-player__bar">
          <span className="mos-player__title">{title}</span>
          <button type="button" className="mos-player__close" onClick={onDismiss} aria-label="Close player">
            ✕
          </button>
        </div>
        {nodes.map((n, i) => (
          <RenderNode key={i} node={n} />
        ))}
      </div>
    </div>
  );
}

/** PendingBar — an indeterminate progress line while an intent is in flight.
 *
 * The transport Acks an intent immediately and pushes its visible result later
 * (ADR 0041), so there is a real gap where the client knows something is
 * happening and the screen does not say so. On a fast render nobody notices it;
 * on a search that waits seconds for an upstream source, it is the difference
 * between "working" and "my click did nothing".
 *
 * Deliberately not a blocking overlay: the current screen stays usable, because
 * the previous content is still valid until the replacement arrives.
 */
function PendingBar() {
  return <div className="mos-pending" role="progressbar" aria-label="Loading" aria-busy="true" />;
}
