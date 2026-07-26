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
import { clearSession, loadSession, type StoredSession } from "@/lib/session";
import { fetchDoorway, invokeDoorway } from "@/lib/bootstrap";
import { useLive, type Intent } from "@/lib/live";
import { routeFromLocation, routeToUrl, sameRoute, type Route } from "@/lib/history";

export function App() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  // The doorway (ADR 0101): the server-emitted screen shown before a session
  // exists, with the skin and the components it needs delivered alongside it.
  // Null until the bootstrap answers, which is the only moment this client has
  // genuinely nothing to draw.
  const [doorway, setDoorway] = useState<UINode | null>(null);
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

  // Boot: a stored credential, or the doorway (ADR 0101's sequence — bootstrap
  // → doorway → sign in or claim → Attach → the session pushes the full library
  // and skin).
  //
  // **Nothing signs in here any more.** The Shell used to authenticate on boot
  // with a username and password compiled into the bundle, which made every
  // browser that opened it the same person and put the administrator's password
  // in a build artefact. Signing in is a form on the doorway now, and this
  // effect's only job is to decide which of the two the client is starting
  // from.
  //
  // A stored credential is used as it is (ADR 0102). That is what makes closing
  // the browser for a fortnight and coming back still signed in the ordinary
  // case rather than the exceptional one: nothing is re-authenticated on boot,
  // because the pair outlived the page.
  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;

    const stored = loadSession();
    if (stored) setSession(stored);

    fetchDoorway(abort.signal).then(
      (d) => !cancelled && setDoorway(d.tree),
      (e: unknown) => {
        // Only fatal when there is no stored credential to fall back on. A
        // client that is already signed in does not need a door, and the
        // reconnect states below describe an unreachable Platform better than a
        // bootstrap failure would.
        if (!cancelled && !stored) {
          setAuthError(e instanceof Error ? e.message : "Could not reach your server.");
        }
      },
    );

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, []);

  // On every (re)connect, re-Attach the current route so the server re-renders
  // exactly what was showing (resume). Stable identity — reads the ref.
  const declareRoute = useCallback((send: (intent: Intent) => void) => {
    const r = routeRef.current;
    send({ kind: "attach", screen: r.screen, params: r.params });
  }, []);

  // A credential that no longer works is a sign-out, and there are now two ways
  // to get one: a refresh chain that could not be renewed, and the account
  // cluster's Sign out, which revokes this very session server-side. They are
  // deliberately one path — ADR 0101's "the same call answers a refused
  // session" — so the client re-asks for the door rather than reasoning about
  // which of them happened.
  //
  // The doorway is re-fetched rather than reused. A server that has been
  // re-claimed, renamed or upgraded since this page loaded serves a door this
  // client has not seen, and the stale one would be a form pointing at a state
  // that no longer exists.
  const onSignedOut = useCallback(() => {
    clearSession();
    setSession(null);
    setAuthError(null);
    fetchDoorway().then(
      (d) => setDoorway(d.tree),
      () => setAuthError("This device was signed out, and the sign-in screen could not be loaded."),
    );
  }, []);

  const { status, shell, regions, toasts, fieldErrors, send, dismissToast, pending } = useLive(session, {
    onOpen: declareRoute,
    onSignedOut,
  });

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

  // A `query` re-reads a screen without pushing history, and *replaces* the
  // current entry rather than adding one. A further page of a list is not
  // somewhere the back button should return to — a viewer who scrolled through
  // five pages should get one press back to where they came from, not five.
  const query = useCallback(
    (screenName: string, params?: Record<string, unknown>) => {
      const next: Route = params ? { screen: screenName, params } : { screen: screenName };
      history.replaceState(next, "", routeToUrl(next));
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

  // No session yet — either still opening one, or refused one. Both are the
  // doorway (ADR 0101): "signed out" and "never signed in" are one path, and
  // the same call answers both, so a server that has since been re-claimed
  // serves a door this client has not seen before without needing to know it
  // changed.
  //
  // It is shown only once it has arrived. A doorway drawn before its skin and
  // its components would be the unstyled page of unregistered components this
  // whole mechanism exists to remove, so the hand-written Standby below covers
  // the gap and nothing else does.
  if ((authError || status !== "open" || !composed) && doorway && status !== "offline") {
    return <DoorwayHost node={doorway} onReplace={setDoorway} />;
  }

  // Sign-in failing is the Platform being unreachable before a session ever
  // existed, so it is the offline state rather than a third variant: there is
  // nothing to retry into, and reloading is the same way out.
  if (authError) return <Standby offline title="Can’t reach your server." message={authError} />;
  if (status !== "open" || !composed) {
    if (status === "offline") {
      return (
        <Standby
          offline
          title="Can’t reach your server."
          message="Mosaic has lost its connection to the Platform and has stopped retrying."
        />
      );
    }
    const reconnecting = status === "reconnecting";
    return (
      <Standby
        title={reconnecting ? "Finding your server." : "Opening a session."}
        message={
          reconnecting
            ? "The connection to the Mosaic Platform dropped. Trying to pick it back up."
            : "Opening a live session with the Mosaic Platform."
        }
      />
    );
  }

  return (
    <ShellProvider
      screen={route.screen}
      params={route.params}
      fieldErrors={fieldErrors ?? undefined}
      onNavigate={navigate}
      onQuery={query}
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

/** DoorwayHost — the pre-session screen (ADR 0101), rendered exactly like every
 *  other server-emitted tree.
 *
 *  It is a ShellProvider around a RenderNode: there is no app shell to fill and
 *  no route to declare, so navigation stays a no-op — a doorway that appeared
 *  to navigate would be an affordance with nothing behind it, which is the
 *  failure ADR 0036 names.
 *
 *  What it does have is one live handler. A doorway's controls emit ordinary
 *  SDUI actions, and they travel on AuthService's pre-session lane because
 *  there is no session and therefore no push lane for the outcome. **This
 *  client interprets none of them**: it forwards the name the server wrote and
 *  applies whichever of the three outcomes comes back. The tree, its
 *  components, its skin and the meaning of its actions are all the Platform's,
 *  so the door can be redesigned — or given a fifth step — without this file
 *  changing at all. */
function DoorwayHost({ node, onReplace }: { node: UINode; onReplace: (n: UINode) => void }) {
  const [fieldErrors, setFieldErrors] = useState<
    { errors: Record<string, string>; formError: string } | undefined
  >(undefined);

  // The doorway's one live handler. It forwards the action name the server
  // wrote and applies whichever of the three outcomes comes back; it does not
  // know what any of them mean, which is what lets the door change without this
  // file changing.
  //
  // A minted session is applied by reloading rather than by lifting state up.
  // Everything above this point — the transport's interceptors, the live
  // socket's retry budget, the history entry — was constructed for a client
  // with no session, and a fresh document is a shorter and far more honest way
  // to become one that has one than re-deriving each of them in place.
  const onInvoke = useCallback((action: string, input?: Record<string, unknown>) => {
    setFieldErrors(undefined);
    invokeDoorway(action, input).then(
      (outcome) => {
        if (outcome.session) {
          window.location.reload();
          return;
        }
        if (outcome.doorway) {
          onReplace(outcome.doorway);
          return;
        }
        if (outcome.fieldErrors) setFieldErrors(outcome.fieldErrors);
      },
      (e: unknown) => {
        // A transport failure has no field to land on, so it lands on the form.
        setFieldErrors({
          errors: {},
          formError: e instanceof Error ? e.message : "That did not work. Try again.",
        });
      },
    );
  }, [onReplace]);

  return (
    <ShellProvider
      screen="doorway"
      fieldErrors={fieldErrors}
      onNavigate={() => {}}
      onQuery={() => {}}
      onBack={() => {}}
      onInvoke={onInvoke}
      onInput={() => {}}
      render={() => null}
    >
      <RenderNode node={node} />
    </ShellProvider>
  );
}

/** Standby — the Shell's only self-rendered UI (ADR 0031): shown when there is
 *  no live session to render from.
 *
 *  It is hand-written, and this is the one place in this client allowed to be.
 *  Everything else is a server-emitted SDUI tree; these screens exist precisely
 *  when there is no server to emit one. They are styled from the design tokens
 *  (standby.css) so a re-skin still reaches them, and they will not live here
 *  forever: in a full deployment the Supervisor is the process still up when the
 *  Platform is not, and it is the honest owner of "the Platform is down".
 *
 *  Two states, and the difference between them is the point. The default is
 *  "wait — I am still asking", with a sweep that says something is in flight.
 *  `offline` is "I have stopped asking", reached when the reconnect budget is
 *  spent. A shell that says "Reconnecting…" forever is lying after the first
 *  minute, and leaves a viewer unable to tell a Platform that is restarting
 *  from one that is switched off.
 *
 *  Neither state invents anything it does not know. The mockups show a server
 *  name, a last-seen time and an offline-downloads route; the Shell has none of
 *  those — it has lost the only connection that could tell it — so they are
 *  left out rather than filled with plausible text. */
function Standby({
  offline = false,
  title,
  message,
}: {
  offline?: boolean;
  title: string;
  message: string;
}) {
  return (
    <div className={offline ? "mos-standby mos-standby--offline" : "mos-standby"}>
      <div className="mos-standby__body">
        <span className="mos-standby__mark" role="img" aria-label="Mosaic">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} />
          ))}
        </span>
        <div className="mos-standby__eyebrow">
          {offline && <span className="mos-standby__dot" />}
          {offline ? "Platform offline" : "Connecting"}
        </div>
        {/* aria-live so a viewer using a screen reader is told when the Shell
            gives up, rather than being left on the last thing it announced. */}
        <h1 className="mos-standby__title" aria-live="polite">
          {title}
        </h1>
        <p className="mos-standby__message">{message}</p>
        {offline ? (
          <div className="mos-standby__actions">
            <button
              type="button"
              className="mos-standby__btn mos-standby__btn--solid"
              // A reload rather than a re-subscribe: the retry budget is spent
              // and its counter lives inside useLive, so a fresh document is the
              // honest way to start a fresh run of attempts.
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : (
          // Shown only while a retry is actually pending. The sweep is a claim
          // that something is in flight, so it must not outlive the retries.
          <div className="mos-standby__bar" role="progressbar" aria-label="Connecting">
            <i />
          </div>
        )}
      </div>
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
