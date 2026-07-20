// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The Shell is a pure renderer (ADR 0031). It owns nothing but the connection
 * lifecycle, a client-only standby state for when there is no server to render
 * from, and the SDUI runtime. All layout — the nav rail, the top bar, the
 * content — is a payload the Platform emits: the app shell is fetched once and
 * its content region is filled with the current screen.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShellProvider, RenderNode, OverlayHost, ToastHost, refreshArtLight } from "@mosaic-media/sdui-react";
import type { UINode } from "@mosaic-media/sdui-react";
import { devSignIn } from "@/lib/session";
import { fetchScreen } from "@/lib/screens";

interface Route {
  screen: string;
  params?: Record<string, unknown>;
}

const errorNode = (category: string, message: string): UINode => ({
  type: "ErrorState",
  props: { category, message },
});

export function App() {
  const [session, setSession] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [shell, setShell] = useState<UINode | null>(null);

  const [stack, setStack] = useState<Route[]>([{ screen: "search" }]);
  const current = stack[stack.length - 1];
  const paramsKey = JSON.stringify(current.params ?? null);

  const [content, setContent] = useState<UINode | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    refreshArtLight();
  }, []);

  // Boot: sign in, then fetch the app shell once.
  useEffect(() => {
    let cancelled = false;
    devSignIn().then(
      async (s) => {
        if (cancelled) return;
        setSession(s);
        try {
          const shellNode = await fetchScreen("shell", undefined, s);
          if (!cancelled) setShell(shellNode);
        } catch (e) {
          if (!cancelled) setAuthError(e instanceof Error ? e.message : "Couldn't load the app shell");
        }
      },
      (e: unknown) => !cancelled && setAuthError(e instanceof Error ? e.message : "Sign-in failed"),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the content screen whenever the route changes.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setContentError(null);
    fetchScreen(current.screen, current.params, session).then(
      (node) => !cancelled && setContent(node),
      (e: unknown) => !cancelled && setContentError(e instanceof Error ? e.message : "Failed to load"),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, current.screen, paramsKey]);

  const navigate = useCallback((screen: string, params?: Record<string, unknown>) => {
    setStack((s) => [...s, { screen, params }]);
  }, []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  // Compose: put the current content into the shell's content region.
  const composed = useMemo<UINode | null>(() => {
    if (!shell) return null;
    const inner: UINode = content ?? (contentError ? errorNode("Unavailable", contentError) : { type: "Fragment" });
    return { ...shell, slots: { ...(shell.slots ?? {}), content: [inner] } };
  }, [shell, content, contentError]);

  // Client-owned meta states — the only thing the Shell renders itself.
  if (authError) return <Standby title="Can’t reach the Platform" message={authError} />;
  if (!session || !composed) return <Standby title="Connecting…" message="Reaching the Mosaic Platform." />;

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
      <RenderNode node={composed} />
    </ShellProvider>
  );
}

/** Standby — the Shell's only self-rendered UI (ADR 0031): shown when there is
 *  no live server to render from. Deliberately minimal — not a fake app. */
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
