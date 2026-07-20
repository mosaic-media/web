/*
 * The Shell chrome: a persistent sidebar + topbar wrapping a routed, server-
 * defined screen. Routing here is intentionally tiny (a screen-name stack) —
 * real navigation is driven by Action envelopes from the payload, not by a
 * client-side route table.
 */

import { useCallback, useEffect, useState } from "react";
import { ShellProvider } from "@/sdui/ShellProvider";
import { RenderNode } from "@/sdui/Renderer";
import { OverlayHost, ToastHost } from "@/components/host";
import { Icon } from "@/components/shared";
import { SCREENS, NAV_ITEMS } from "@/mock/screens";
import { Gallery } from "@/gallery/Gallery";

type Theme = "dark" | "light";

interface Route {
  screen: string;
  params?: Record<string, unknown>;
}

export function App() {
  const [stack, setStack] = useState<Route[]>([{ screen: "home" }]);
  const [theme, setTheme] = useState<Theme>("dark");
  const current = stack[stack.length - 1];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
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
            <span className="msc-sidebar__logo" aria-hidden />
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
            <div className="msc-sidebar__sep" />
            <button
              className={`msc-navitem${current.screen === "__gallery" ? " is-active" : ""}`}
              onClick={() => go("__gallery")}
            >
              <Icon name="grid" />
              <span>Components</span>
            </button>
          </nav>
          <div className="msc-sidebar__foot">
            <span className="msc-sidebar__version">shell v0.0.1 · skeleton</span>
          </div>
        </aside>

        <div className="msc-main">
          <header className="msc-topbar">
            <div className="msc-topbar__left">
              {stack.length > 1 && (
                <button className="msc-iconbtn msc-iconbtn--ghost" aria-label="Back" onClick={back}>
                  <Icon name="chevron-right" style={{ transform: "rotate(180deg)" }} />
                </button>
              )}
              <span className="msc-topbar__crumb">{titleFor(current.screen)}</span>
            </div>
            <div className="msc-topbar__right">
              <button
                className="msc-iconbtn msc-iconbtn--ghost"
                aria-label="Toggle theme"
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              >
                <Icon name={theme === "dark" ? "star" : "info"} />
              </button>
              <span className="msc-avatar" aria-hidden>
                A
              </span>
            </div>
          </header>

          <main className="msc-content">
            {current.screen === "__gallery" ? (
              <Gallery />
            ) : screenNode ? (
              <RenderNode node={screenNode} />
            ) : (
              <RenderNode
                node={{
                  type: "ErrorState",
                  props: { category: "NotFound", message: `No screen named "${current.screen}".` },
                }}
              />
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
