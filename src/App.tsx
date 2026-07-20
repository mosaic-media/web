// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The Shell chrome: a persistent sidebar + topbar wrapping a routed, server-
 * defined screen. Routing here is intentionally tiny (a screen-name stack) —
 * real navigation is driven by Action envelopes from the payload, not by a
 * client-side route table.
 */

import { useCallback, useEffect, useState } from "react";
import { ShellProvider, RenderNode, OverlayHost, ToastHost, Icon, refreshArtLight } from "@mosaic-media/sdui-react";
import type { UINode } from "@mosaic-media/sdui-react";
import { SCREENS, NAV_ITEMS } from "@/mock/screens";
import { Gallery } from "@/gallery/Gallery";
import { devSignIn } from "@/lib/session";
import { fetchScreen, LIVE_SCREENS } from "@/lib/screens";

/** A minimal SDUI error node for the chrome to render on a failure. */
const errorNode = (category: string, message: string): UINode => ({
  type: "ErrorState",
  props: { category, message },
});

type Theme = "dark" | "light";

/** Recently-watched thumbs shown in the sidebar's Library section. */
const RECENT = [
  { title: "Cowboy Bebop", art: "cowboy-bebop" },
  { title: "Dune", art: "dune" },
  { title: "Frieren", art: "frieren" },
];

interface Route {
  screen: string;
  params?: Record<string, unknown>;
}

export function App() {
  const [stack, setStack] = useState<Route[]>([{ screen: "search" }]);
  const [theme, setTheme] = useState<Theme>("dark");
  const current = stack[stack.length - 1];

  // Dev sign-in on boot: arm the runtime client with a session so both the
  // screen queries and the actions the runtime dispatches are authenticated,
  // without a login form (see lib/session).
  const [session, setSession] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
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

  // Live screen loading: when the current route is a Platform-emitted screen,
  // fetch and render it; otherwise the mock chrome screens are used below.
  const isLive = LIVE_SCREENS.has(current.screen);
  const paramsKey = JSON.stringify(current.params ?? null);
  const [liveNode, setLiveNode] = useState<UINode | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!isLive || !session) return;
    let cancelled = false;
    setLoading(true);
    setScreenError(null);
    fetchScreen(current.screen, current.params, session).then(
      (node) => {
        if (cancelled) return;
        setLiveNode(node);
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setScreenError(e instanceof Error ? e.message : "Failed to load screen");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // paramsKey stands in for current.params (a fresh object each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, current.screen, paramsKey, session]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // The ambient wash sits at a different intensity per theme — repaint the
    // standing artwork light so it follows the toggle.
    refreshArtLight();
  }, [theme]);

  const navigate = useCallback((screen: string, params?: Record<string, unknown>) => {
    setStack((s) => [...s, { screen, params }]);
  }, []);

  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const go = (screen: string) => setStack([{ screen }]);

  const screenNode = SCREENS[current.screen];

  return (
    <ShellProvider
      screen={current.screen}
      onNavigate={navigate}
      onBack={back}
      render={({ overlays, toasts, dismissOverlay, dismissToast }) => (
        <>
          <OverlayHost overlays={overlays} onDismiss={dismissOverlay} />
          <ToastHost toasts={toasts} onDismiss={dismissToast} />
        </>
      )}
    >
      <div className="msc-app">
        <aside className="msc-sidebar">
          <div className="msc-sidebar__brand">
            <img
              className="msc-sidebar__logo"
              src={`${import.meta.env.BASE_URL}mosaic-icon-${theme}.png`}
              alt="Mosaic"
              width={30}
              height={30}
            />
            <span className="msc-sidebar__name">Mosaic</span>
          </div>
          <nav className="msc-sidebar__nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.screen}
                className={`msc-navitem${current.screen === item.screen ? " is-active" : ""}`}
                onClick={() => go(item.screen)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="msc-sidebar__label">Library</div>
          <div className="msc-sidebar__recent">
            {RECENT.map((r) => (
              <button
                key={r.art}
                className="msc-sidebar__thumb"
                title={r.title}
                onClick={() => navigate("detail", { title: r.title })}
              >
                <img src={`/art/${r.art}.svg`} alt={r.title} />
              </button>
            ))}
          </div>
          <nav className="msc-sidebar__nav">
            <button
              className={`msc-navitem${current.screen === "__gallery" ? " is-active" : ""}`}
              onClick={() => go("__gallery")}
            >
              <Icon name="grid" />
              <span>Components</span>
            </button>
          </nav>
          <div className="msc-sidebar__foot">
            <button className="msc-usercard" onClick={() => go("settings")}>
              <span className="msc-avatar" aria-hidden>
                S
              </span>
              <span className="msc-usercard__info">
                <span className="msc-usercard__name">Shikikan</span>
                <span className="msc-usercard__role">Administrator</span>
              </span>
              <Icon name="chevron-down" />
            </button>
            <span className="msc-sidebar__version">shell v0.0.1 · skeleton</span>
          </div>
        </aside>

        <div className="msc-main">
          <header className="msc-topbar">
            <div className="msc-topbar__left">
              {stack.length > 1 && (
                <button className="msc-iconbtn msc-iconbtn--ghost" aria-label="Back" onClick={back}>
                  <Icon name="chevron-left" />
                </button>
              )}
              <span className="msc-topbar__crumb">{titleFor(current.screen)}</span>
            </div>
            <div className="msc-search msc-topbar__search">
              <span className="msc-search__icon">
                <Icon name="search" size="1em" />
              </span>
              <input
                className="msc-search__input"
                placeholder="Search for anime, movies, shows…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") setStack([{ screen: "search", params: { text: e.currentTarget.value } }]);
                }}
              />
            </div>
            <div className="msc-topbar__right">
              <button
                className="msc-iconbtn msc-iconbtn--ghost"
                aria-label="Settings"
                onClick={() => go("settings")}
              >
                <Icon name="settings" />
              </button>
              <button
                className="msc-iconbtn msc-iconbtn--ghost"
                aria-label="Toggle theme"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              >
                <Icon name={theme === "dark" ? "moon" : "sun"} />
              </button>
            </div>
          </header>

          <main className="msc-content">
            {current.screen === "__gallery" ? (
              <Gallery />
            ) : isLive ? (
              authError ? (
                <RenderNode node={errorNode("Unavailable", authError)} />
              ) : !session || loading ? (
                <p className="msc-content__note">Connecting to the Platform…</p>
              ) : screenError ? (
                <RenderNode node={errorNode("Unavailable", screenError)} />
              ) : liveNode ? (
                <RenderNode node={liveNode} />
              ) : (
                <p className="msc-content__note">Loading…</p>
              )
            ) : screenNode ? (
              <RenderNode node={screenNode} />
            ) : (
              <RenderNode node={errorNode("NotFound", `No screen named "${current.screen}".`)} />
            )}
          </main>
        </div>
      </div>
    </ShellProvider>
  );
}

function titleFor(screen: string): string {
  if (screen === "__gallery") return "Component gallery";
  return screen.charAt(0).toUpperCase() + screen.slice(1);
}
