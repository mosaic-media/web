// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * A lightweight component gallery — a Storybook-lite. Every entry is a real
 * UINode rendered through the real registry, so this page doubles as living
 * documentation and a smoke test: if a component breaks, its tile breaks here.
 */

import { RenderNode, registeredTypes, type UINode } from "@mosaic-media/sdui-react";

interface Demo {
  name: string;
  node: UINode | UINode[];
  wide?: boolean;
}

interface Group {
  title: string;
  blurb: string;
  demos: Demo[];
}

const poster = (title: string, mediaType: string, extra: Record<string, unknown> = {}): UINode => ({
  type: "PosterCard",
  props: { title, mediaType, action: { kind: "toast", message: `Open ${title}`, tone: "accent" }, ...extra },
});

const GROUPS: Group[] = [
  {
    title: "Layout",
    blurb: "Containers. They arrange children and named slots; they know nothing about media.",
    demos: [
      {
        name: "Section + Carousel",
        wide: true,
        node: {
          type: "Section",
          props: { title: "A rail", action: { kind: "toast", message: "See all" }, actionLabel: "See all" },
          children: [{ type: "Carousel", children: [poster("One", "Film"), poster("Two", "Series"), poster("Three", "Anime Series"), poster("Four", "Film"), poster("Five", "Film")] }],
        },
      },
      { name: "Grid", wide: true, node: { type: "Grid", props: { minColumnWidth: 130 }, children: [poster("A", "Film"), poster("B", "Series"), poster("C", "Anime Series"), poster("D", "Film")] } },
      {
        name: "Stack (horizontal)",
        node: { type: "Stack", props: { direction: "horizontal", gap: 2 }, children: [{ type: "Badge", props: { label: "One" } }, { type: "Badge", props: { label: "Two" } }, { type: "Badge", props: { label: "Three" } }] },
      },
      {
        name: "Tabs",
        wide: true,
        node: {
          type: "Tabs",
          props: { tabs: [{ id: "a", label: "Overview" }, { id: "b", label: "Details" }] },
          slots: { a: { type: "Banner", props: { message: "Overview panel content." } }, b: { type: "Banner", props: { tone: "success", message: "Details panel content." } } },
        },
      },
      { name: "Divider", wide: true, node: { type: "Divider", props: { label: "Section break" } } },
    ],
  },
  {
    title: "Media",
    blurb: "Bound to the content model — Node, Part, Relation, SourceBinding.",
    demos: [
      { name: "PosterCard (with progress)", node: poster("Cowboy Bebop", "Anime Series", { subtitle: "S1 · E12", progress: 0.6, badge: "NEW" }) },
      {
        name: "HeroBanner",
        wide: true,
        node: {
          type: "HeroBanner",
          props: { title: "Spirited Away", meta: ["2001", "Anime Film", "PG"], overview: "A young girl wanders into a world of spirits." },
          slots: { actions: [{ type: "Button", props: { label: "Play", icon: "play" } }, { type: "Button", props: { label: "Details", variant: "secondary" } }] },
        },
      },
      { name: "EpisodeRow", wide: true, node: { type: "EpisodeRow", props: { index: 1, title: "Asteroid Blues", runtime: "24m", watched: true, overview: "Spike and Jet chase a bounty." } } },
      {
        name: "DetailHeader",
        wide: true,
        node: { type: "DetailHeader", props: { title: "Cowboy Bebop", year: "1998", mediaType: "Anime Series", rating: "8.9", genres: ["Action", "Sci-Fi"], overview: "The bounty-hunting adventures of the Bebop crew." } },
      },
      { name: "SeasonSelector", wide: true, node: { type: "SeasonSelector", props: { seasons: [{ id: "1", label: "Season 1" }, { id: "2", label: "Season 2" }, { id: "3", label: "Specials" }] } } },
      { name: "SourcePicker", wide: true, node: { type: "SourcePicker", props: { sources: [{ label: "Asteroid Blues — 1080p", quality: "1080p", provider: "stremio" }, { label: "Asteroid Blues — 720p", quality: "720p", provider: "stremio" }] } } },
      { name: "PlaybackBar", wide: true, node: { type: "PlaybackBar", props: { title: "Cowboy Bebop", subtitle: "S1 · E12 — Jupiter Jazz", progress: 0.62 } } },
      { name: "PersonChip", node: { type: "PersonChip", props: { name: "Kōichi Yamadera", role: "Spike Spiegel" } } },
      { name: "GenreTag", node: { type: "Stack", props: { direction: "horizontal", gap: 2, wrap: true }, children: [{ type: "GenreTag", props: { label: "Sci-Fi", action: { kind: "toast", message: "Sci-Fi" } } }, { type: "GenreTag", props: { label: "Neo-noir" } }] } },
    ],
  },
  {
    title: "Controls",
    blurb: "Interactive. Buttons carry Actions; form controls back module settings and admin config.",
    demos: [
      {
        name: "Buttons",
        node: {
          type: "Stack",
          props: { direction: "horizontal", gap: 2, wrap: true },
          children: [
            { type: "Button", props: { label: "Primary", variant: "primary", icon: "play" } },
            { type: "Button", props: { label: "Secondary", variant: "secondary" } },
            { type: "Button", props: { label: "Ghost", variant: "ghost" } },
            { type: "Button", props: { label: "Danger", variant: "danger" } },
          ],
        },
      },
      { name: "IconButton + Menu", node: { type: "Stack", props: { direction: "horizontal", gap: 3 }, children: [{ type: "IconButton", props: { icon: "plus", label: "Add", variant: "solid" } }, { type: "IconButton", props: { icon: "check", label: "Done" } }, { type: "Menu", props: { items: [{ label: "Play", icon: "play" }, { label: "Add to list", icon: "plus" }, { label: "Remove", icon: "close", tone: "danger" }] } }] } },
      { name: "SearchBar", wide: true, node: { type: "SearchBar", props: {} } },
      { name: "TextField", node: { type: "TextField", props: { label: "Addon manifest URL", placeholder: "https://…/manifest.json", help: "Paste a Stremio addon URL." } } },
      { name: "Toggle", node: { type: "Toggle", props: { label: "Include remote streams", value: true } } },
      { name: "Select", node: { type: "Select", props: { label: "Quality", options: [{ value: "auto", label: "Auto" }, { value: "1080", label: "1080p" }] } } },
      { name: "Slider", node: { type: "Slider", props: { label: "Result limit", min: 5, max: 100, value: 40 } } },
      { name: "RatingControl", node: { type: "RatingControl", props: { value: 4 } } },
      { name: "ProgressBar", node: { type: "ProgressBar", props: { value: 0.4 } } },
      { name: "Pagination", node: { type: "Pagination", props: { label: "2 / 6", hasPrev: true, hasNext: true, prevAction: { kind: "toast", message: "Prev" }, nextAction: { kind: "toast", message: "Next" } } } },
    ],
  },
  {
    title: "Feedback & state",
    blurb: "The parts a media UI forgets until they hurt. Error states map to Platform error categories.",
    demos: [
      { name: "Skeleton (rail)", wide: true, node: { type: "Skeleton", props: { shape: "poster", count: 5 } } },
      { name: "EmptyState", wide: true, node: { type: "EmptyState", props: { icon: "search", title: "No results", message: "Try a different search term." } } },
      { name: "ErrorState (Unavailable)", wide: true, node: { type: "ErrorState", props: { category: "Unavailable", message: "The Platform is not responding.", retry: { kind: "toast", message: "Retrying…" } } } },
      { name: "Banner", wide: true, node: { type: "Stack", props: { gap: 2 }, children: [{ type: "Banner", props: { tone: "info", message: "Informational banner." } }, { type: "Banner", props: { tone: "warning", title: "Heads up", message: "Something needs attention." } }] } },
      { name: "Badge", node: { type: "Stack", props: { direction: "horizontal", gap: 2, wrap: true }, children: [{ type: "Badge", props: { label: "NEW", tone: "accent" } }, { type: "Badge", props: { label: "4K", tone: "success" } }, { type: "Badge", props: { label: "Beta", tone: "warning" } }] } },
      { name: "StatusIndicator", node: { type: "Stack", props: { direction: "horizontal", gap: 4, wrap: true }, children: [{ type: "StatusIndicator", props: { tone: "success", label: "Online" } }, { type: "StatusIndicator", props: { tone: "warning", label: "Degraded" } }, { type: "StatusIndicator", props: { tone: "danger", label: "Down" } }] } },
      { name: "Unknown (forward-compat)", node: { type: "SomeFutureModuleCard", props: {} } },
    ],
  },
  {
    title: "Primitives",
    blurb: "The irreducible, token-only building blocks. Every presentational component (and every module component) composes from these — the same tree renders on any client.",
    demos: [
      {
        name: "Box + Text + Icon (composed inline)",
        wide: true,
        node: {
          type: "Box",
          props: { style: { direction: "row", gap: 3, align: "center", p: 4, bg: "surface-raised", radius: "lg", border: true } },
          children: [
            { type: "Icon", props: { name: "play", color: "accent", size: 22 } },
            {
              type: "Box",
              props: { style: { gap: 1 } },
              children: [
                { type: "Text", props: { text: "Composed from primitives", style: { variant: "md", weight: "bold" } } },
                { type: "Text", props: { text: "Box · Text · Icon — token styles only", style: { variant: "sm", color: "text-muted" } } },
              ],
            },
            { type: "Spacer", props: { grow: true } },
            { type: "Pressable", props: { action: { kind: "toast", message: "Pressable fired" }, lift: true, style: { bg: "accent", color: "text-on-accent", radius: "md", px: 4, py: 2 } }, children: [{ type: "Text", props: { text: "Pressable" } }] },
          ],
        },
      },
      { name: "PosterCard (this IS a primitive definition)", node: poster("Cowboy Bebop", "Anime Series", { subtitle: "S1 · E12", progress: 0.6, badge: "NEW" }) },
    ],
  },
  {
    title: "Module-defined (from primitives)",
    blurb: "Components a module contributed as pure data — the Platform never shipped them. Registered at runtime via defineComponent; the Shell expands the primitive template like any other node.",
    demos: [
      {
        name: "module.StatChip",
        wide: true,
        node: {
          type: "Box",
          props: { style: { direction: "row", gap: 2, wrap: true } },
          children: [
            { type: "module.StatChip", props: { icon: "star", label: "Rating", value: "8.9" } },
            { type: "module.StatChip", props: { icon: "grid", label: "Episodes", value: "26", tone: "success" } },
            { type: "module.StatChip", props: { icon: "info", label: "Year", value: "1998", tone: "info" } },
          ],
        },
      },
      {
        name: "module.Panel (Outlet passthrough)",
        wide: true,
        node: {
          type: "module.Panel",
          props: { title: "A module-defined panel" },
          children: [
            { type: "Text", props: { text: "The caller's children flow into the panel body through an Outlet.", style: { color: "text-muted" } } },
            { type: "module.StatChip", props: { icon: "check", label: "Nested", value: "works" } },
          ],
        },
      },
    ],
  },
];

export function Gallery() {
  const types = registeredTypes();
  return (
    <div className="msc-gallery">
      <header className="msc-gallery__intro">
        <h1>Component gallery</h1>
        <p>
          Every tile below is a real server-driven <code>UINode</code> rendered through the live registry.
          {" "}
          <strong>{types.length}</strong> component types are registered.
        </p>
        <div className="msc-gallery__types">
          {types.map((t) => (
            <code key={t} className="msc-gallery__type">
              {t}
            </code>
          ))}
        </div>
      </header>

      {GROUPS.map((group) => (
        <section key={group.title} className="msc-gallery__group">
          <div className="msc-gallery__grouphead">
            <h2>{group.title}</h2>
            <p>{group.blurb}</p>
          </div>
          <div className="msc-gallery__demos">
            {group.demos.map((demo) => (
              <figure key={demo.name} className={`msc-gallery__demo${demo.wide ? " msc-gallery__demo--wide" : ""}`}>
                <figcaption className="msc-gallery__demoname">{demo.name}</figcaption>
                <div className="msc-gallery__stage">
                  {Array.isArray(demo.node) ? demo.node.map((n, i) => <RenderNode key={i} node={n} />) : <RenderNode node={demo.node} />}
                </div>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
