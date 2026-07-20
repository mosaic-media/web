import { useEffect, useState } from "react";
import { ShellProvider, RenderNode, registeredTypes, type UINode } from "@mosaic-media/sdui-react";
import { OverlayHost, ToastHost } from "@mosaic-media/sdui-react";
import { GROUPS } from "./catalog";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function Stage({ node }: { node: UINode | UINode[] }) {
  const nodes = Array.isArray(node) ? node : [node];
  return (
    <>
      {nodes.map((n, i) => (
        <RenderNode key={i} node={n} />
      ))}
    </>
  );
}

export function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ShellProvider
      screen="storybook"
      onNavigate={() => {}}
      onBack={() => {}}
      render={({ overlays, toasts, dismissOverlay, dismissToast }) => (
        <>
          <OverlayHost overlays={overlays} onDismiss={dismissOverlay} />
          <ToastHost toasts={toasts} onDismiss={dismissToast} />
        </>
      )}
    >
      <div className="sb">
        <aside className="sb-side">
          <div className="sb-brand">
            <img className="sb-logo" src={`${import.meta.env.BASE_URL}mosaic-icon-${theme}.png`} alt="Mosaic" width={32} height={32} />
            <div>
              <div className="sb-brand__name">Mosaic SDUI</div>
              <div className="sb-brand__sub">Component storybook</div>
            </div>
          </div>
          <nav className="sb-nav">
            {GROUPS.map((g) => (
              <a key={g.title} href={`#${slug(g.title)}`} className="sb-nav__link">
                {g.title}
              </a>
            ))}
          </nav>
          <div className="sb-side__foot">
            <button className="sb-theme" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
              {theme === "dark" ? "☾ Dark" : "☀ Light"}
            </button>
            <span className="sb-count">{registeredTypes().length} types registered</span>
          </div>
        </aside>

        <main className="sb-main">
          <header className="sb-hero">
            <h1>Mosaic SDUI — Component Storybook</h1>
            <p>
              Every tile is real server-driven-UI data rendered live through{" "}
              <code>@mosaic-media/sdui-react</code>, shown beside the <code>UINode</code> payload that produced it. For a
              definitions-as-data system, the payload <em>is</em> the component's API.
            </p>
          </header>

          {GROUPS.map((group) => (
            <section key={group.title} id={slug(group.title)} className="sb-group">
              <div className="sb-group__head">
                <h2>{group.title}</h2>
                <p>{group.blurb}</p>
              </div>
              {group.demos.map((demo) => (
                <figure key={demo.name} className="sb-demo">
                  <figcaption className="sb-demo__name">{demo.name}</figcaption>
                  <div className="sb-demo__body">
                    <div className="sb-stage">
                      <Stage node={demo.node} />
                    </div>
                    <pre className="sb-json">
                      <code>{JSON.stringify(demo.node, null, 2)}</code>
                    </pre>
                  </div>
                </figure>
              ))}
            </section>
          ))}

          <footer className="sb-footer">
            Rendered by <code>@mosaic-media/sdui-react</code> · data from the{" "}
            <code>@mosaic-media/sdui</code> contract · AGPL-3.0-only
          </footer>
        </main>
      </div>
    </ShellProvider>
  );
}
