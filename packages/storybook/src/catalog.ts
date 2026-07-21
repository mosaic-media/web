// The catalogue: example UINode payloads per component. Each entry is real SDUI
// data — the storybook renders it through @mosaic-media/sdui-react and shows the
// JSON beside it. This is the doc: for a definitions-as-data system, the payload
// IS the component's API.

import type { UINode } from "@mosaic-media/sdui-react";

export interface Demo {
  name: string;
  node: UINode | UINode[];
}

export interface Group {
  title: string;
  blurb: string;
  demos: Demo[];
}

const poster = (title: string, mediaType: string, extra: Record<string, unknown> = {}): UINode => ({
  type: "PosterCard",
  props: { title, mediaType, action: { kind: "toast", message: `Open ${title}`, tone: "accent" }, ...extra },
});

export const GROUPS: Group[] = [
  {
    title: "Primitives",
    blurb:
      "The irreducible, client-implemented vocabulary — the only native code. Token-only styles, the web∩Flutter intersection. Every other component composes these.",
    demos: [
      {
        name: "Box · Text · Icon · Pressable",
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
            {
              type: "Pressable",
              props: { action: { kind: "toast", message: "Pressable fired" }, lift: true, style: { bg: "accent", color: "text-on-accent", radius: "md", px: 4, py: 2 } },
              children: [{ type: "Text", props: { text: "Pressable" } }],
            },
          ],
        },
      },
    ],
  },
  {
    title: "Layout",
    blurb: "Containers — definitions that arrange children and named slots.",
    demos: [
      {
        name: "Section + Carousel",
        node: {
          type: "Section",
          props: { title: "A rail", action: { kind: "toast", message: "See all" }, actionLabel: "See all" },
          children: [{ type: "Carousel", children: [poster("One", "Film"), poster("Two", "Series"), poster("Three", "Anime Series"), poster("Four", "Film"), poster("Five", "Film")] }],
        },
      },
      { name: "Grid", node: { type: "Grid", props: { minColumnWidth: 130 }, children: [poster("A", "Film"), poster("B", "Series"), poster("C", "Anime Series"), poster("D", "Film")] } },
      {
        name: "Tabs",
        node: {
          type: "Tabs",
          props: { tabs: [{ id: "a", label: "Overview" }, { id: "b", label: "Details" }] },
          slots: { a: { type: "Banner", props: { message: "Overview panel." } }, b: { type: "Banner", props: { tone: "success", message: "Details panel." } } },
        },
      },
      { name: "Divider", node: { type: "Divider", props: { label: "Section break" } } },
    ],
  },
  {
    title: "Media",
    blurb: "Bound to the content model — Node, Part, Relation, SourceBinding.",
    demos: [
      { name: "PosterCard", node: poster("Cowboy Bebop", "Anime Series", { subtitle: "S1 · E12", progress: 0.6, badge: "NEW" }) },
      {
        name: "HeroBanner",
        node: {
          type: "HeroBanner",
          props: {
            kicker: "Continue watching",
            title: "Spirited Away",
            nativeTitle: "千と千尋の神隠し",
            meta: ["2001", "Anime Film", "PG"],
            overview: "A young girl wanders into a world of spirits.",
          },
          slots: {
            actions: [{ type: "Button", props: { label: "Play", variant: "primary", icon: "play", action: { kind: "toast", message: "Play" } } }, { type: "Button", props: { label: "Details", variant: "secondary", action: { kind: "toast", message: "Details" } } }],
            aside: {
              type: "Box",
              props: { style: { minWidth: 200, p: 4, gap: 2, radius: "lg", bg: "surface", glass: true, border: true } },
              children: [
                { type: "Text", props: { text: "Information", style: { variant: "xs", color: "text-faint", transform: "uppercase" } } },
                { type: "Text", props: { text: "Studio Ghibli · 125 min", style: { variant: "sm" } } },
              ],
            },
          },
        },
      },
      { name: "EpisodeRow", node: { type: "EpisodeRow", props: { index: 1, title: "Asteroid Blues", runtime: "24m", watched: true, overview: "Spike and Jet chase a bounty.", action: { kind: "toast", message: "Play E1" } } } },
      {
        name: "DetailHeader",
        node: { type: "DetailHeader", props: { title: "Cowboy Bebop", year: "1998", mediaType: "Anime Series", rating: "8.9", genres: ["Action", "Sci-Fi", "Neo-noir"], overview: "The bounty-hunting adventures of the Bebop crew." } },
      },
      { name: "SeasonSelector", node: { type: "SeasonSelector", props: { seasons: [{ id: "1", label: "Season 1" }, { id: "2", label: "Season 2" }, { id: "3", label: "Specials" }] } } },
      { name: "SourcePicker", node: { type: "SourcePicker", props: { sources: [{ label: "Asteroid Blues — 1080p", quality: "1080p", provider: "stremio", action: { kind: "toast", message: "1080p" } }, { label: "Asteroid Blues — 720p", quality: "720p", provider: "stremio", action: { kind: "toast", message: "720p" } }] } } },
      { name: "PlaybackBar", node: { type: "PlaybackBar", props: { title: "Cowboy Bebop", subtitle: "S1 · E12 — Jupiter Jazz", progress: 0.62, action: { kind: "toast", message: "Resume" } } } },
      { name: "PersonChip", node: { type: "Stack", props: { direction: "horizontal", gap: 3, wrap: true }, children: [{ type: "PersonChip", props: { name: "Kōichi Yamadera", role: "Spike Spiegel" } }, { type: "PersonChip", props: { name: "Megumi Hayashibara", role: "Faye Valentine" } }] } },
    ],
  },
  {
    title: "Controls",
    blurb: "Buttons carry Actions; form controls back module settings and admin config.",
    demos: [
      {
        name: "Buttons",
        node: {
          type: "Stack",
          props: { direction: "horizontal", gap: 2, wrap: true },
          children: [
            { type: "Button", props: { label: "Primary", variant: "primary", icon: "play", action: { kind: "toast", message: "Primary" } } },
            { type: "Button", props: { label: "Secondary", variant: "secondary", action: { kind: "toast", message: "Secondary" } } },
            { type: "Button", props: { label: "Ghost", variant: "ghost", action: { kind: "toast", message: "Ghost" } } },
            { type: "Button", props: { label: "Danger", variant: "danger", action: { kind: "toast", message: "Danger" } } },
          ],
        },
      },
      { name: "SearchBar", node: { type: "SearchBar", props: {} } },
      { name: "TextField", node: { type: "TextField", props: { label: "Addon manifest URL", placeholder: "https://…/manifest.json", help: "Paste a Stremio addon URL." } } },
      { name: "Toggle", node: { type: "Toggle", props: { label: "Include remote streams", value: true } } },
      { name: "Select", node: { type: "Select", props: { label: "Quality", options: [{ value: "auto", label: "Auto" }, { value: "1080", label: "1080p" }] } } },
      { name: "Slider", node: { type: "Slider", props: { label: "Result limit", min: 5, max: 100, value: 40 } } },
      { name: "RatingControl", node: { type: "RatingControl", props: { value: 4 } } },
      { name: "ProgressBar", node: { type: "ProgressBar", props: { value: 0.4 } } },
      { name: "ProgressRing", node: { type: "ProgressRing", props: { value: 0.84 } } },
      { name: "Pagination", node: { type: "Pagination", props: { label: "2 / 6", hasPrev: true, hasNext: true, prevAction: { kind: "toast", message: "Prev" }, nextAction: { kind: "toast", message: "Next" } } } },
    ],
  },
  {
    title: "Feedback & state",
    blurb: "Loading, empty, error, badges. Error states map to the Platform's error categories.",
    demos: [
      { name: "Skeleton", node: { type: "Skeleton", props: { shape: "poster", count: 5 } } },
      { name: "EmptyState", node: { type: "EmptyState", props: { icon: "search", title: "No results", message: "Try a different search term." } } },
      { name: "ErrorState", node: { type: "ErrorState", props: { category: "Unavailable", message: "The Platform is not responding.", retry: { kind: "toast", message: "Retrying…" } } } },
      { name: "Banner", node: { type: "Stack", props: { gap: 2 }, children: [{ type: "Banner", props: { tone: "info", message: "Informational banner." } }, { type: "Banner", props: { tone: "warning", title: "Heads up", message: "Something needs attention." } }] } },
      { name: "Badge", node: { type: "Stack", props: { direction: "horizontal", gap: 2, wrap: true }, children: [{ type: "Badge", props: { label: "NEW", tone: "accent" } }, { type: "Badge", props: { label: "4K", tone: "success" } }, { type: "Badge", props: { label: "Beta", tone: "warning" } }] } },
      { name: "StatusIndicator", node: { type: "Stack", props: { direction: "horizontal", gap: 4, wrap: true }, children: [{ type: "StatusIndicator", props: { tone: "success", label: "Online" } }, { type: "StatusIndicator", props: { tone: "warning", label: "Degraded" } }, { type: "StatusIndicator", props: { tone: "danger", label: "Down" } }] } },
    ],
  },
  {
    title: "Module-defined (from data)",
    blurb: "Components a module contributed as pure ComponentDefinition data — the Platform never shipped them. Registered at runtime; rendered identically to built-ins.",
    demos: [
      {
        name: "module.StatChip",
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
        name: "Unknown (forward-compat)",
        node: { type: "SomeFutureModuleCard", props: {} },
      },
    ],
  },
];
