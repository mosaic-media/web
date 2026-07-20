// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Mock SDUI payloads. These are exactly the shape the Platform will send: trees
 * of UINodes with Action envelopes. The Shell renders them with zero knowledge
 * that they're local — swap this for a real GraphQL query and nothing in the
 * renderer changes. That's the point of the skeleton.
 *
 * Posters/backdrops are intentionally omitted so the typed placeholders show —
 * honest for a skeleton with no media library attached yet.
 */

import type { UINode } from "@/sdui/types";

const nav = (screen: string, params?: Record<string, unknown>): UINode["props"] => ({
  action: { kind: "navigate", screen, params },
});

const posterCard = (title: string, mediaType: string, extra: Record<string, unknown> = {}): UINode => ({
  type: "PosterCard",
  props: { title, mediaType, ...nav("detail", { title }), ...extra },
});

function rail(title: string, items: UINode[], seeAll = true): UINode {
  return {
    type: "Section",
    props: {
      title,
      ...(seeAll ? { action: { kind: "navigate", screen: "browse", params: { title } }, actionLabel: "See all" } : {}),
    },
    children: [{ type: "Carousel", children: items }],
  };
}

const home: UINode = {
  type: "Screen",
  children: [
    {
      type: "HeroBanner",
      props: {
        title: "Spirited Away",
        meta: ["2001", "Anime Film", "PG"],
        overview:
          "A young girl wanders into a world of spirits and must find the courage to free her parents and return home.",
      },
      slots: {
        actions: [
          { type: "Button", props: { label: "Play", icon: "play", variant: "primary", action: { kind: "playPart", partId: "demo-part" } } },
          { type: "Button", props: { label: "Details", variant: "secondary", ...nav("detail", { title: "Spirited Away" }) } },
        ],
      },
    },
    rail(
      "Continue watching",
      [
        posterCard("Cowboy Bebop", "Anime Series", { subtitle: "S1 · E12", progress: 0.6, badge: "12 min left" }),
        posterCard("Dune", "Film", { subtitle: "1h 41m in", progress: 0.75 }),
        posterCard("Severance", "Series", { subtitle: "S1 · E3", progress: 0.2 }),
        posterCard("Frieren", "Anime Series", { subtitle: "S1 · E8", progress: 0.45 }),
      ],
      false,
    ),
    rail("Recently added", [
      posterCard("Blade Runner 2049", "Film"),
      posterCard("Chainsaw Man", "Anime Series", { badge: "NEW" }),
      posterCard("Foundation", "Series"),
      posterCard("Vinland Saga", "Anime Series"),
      posterCard("Arrival", "Film"),
      posterCard("Pluto", "Anime Series", { badge: "NEW" }),
    ]),
    rail("Anime films", [
      posterCard("Your Name", "Anime Film"),
      posterCard("Akira", "Anime Film"),
      posterCard("Perfect Blue", "Anime Film"),
      posterCard("A Silent Voice", "Anime Film"),
      posterCard("Paprika", "Anime Film"),
    ]),
  ],
};

const sourcesSheet: UINode = {
  type: "Stack",
  props: { gap: 4 },
  children: [
    { type: "Banner", props: { tone: "info", title: "Sources", message: "Pick a stream. Provided by installed modules (e.g. Stremio addons)." } },
    {
      type: "SourcePicker",
      props: {
        sources: [
          { label: "Asteroid Blues — 1080p", quality: "1080p", provider: "stremio", kind: "stream", action: { kind: "playPart", partId: "ep-1-1080" } },
          { label: "Asteroid Blues — 720p", quality: "720p", provider: "stremio", kind: "stream", action: { kind: "playPart", partId: "ep-1-720" } },
        ],
      },
    },
  ],
};

const detail: UINode = {
  type: "Screen",
  children: [
    {
      type: "DetailHeader",
      props: {
        title: "Cowboy Bebop",
        year: "1998",
        mediaType: "Anime Series",
        rating: "8.9",
        genres: ["Action", "Sci-Fi", "Neo-noir", "Space Western"],
        overview:
          "The bounty-hunting adventures of the Bebop crew as they chase down the galaxy's most dangerous criminals — for cash they'll spend before the next job.",
      },
      slots: {
        actions: [
          { type: "Button", props: { label: "Play S1 · E1", icon: "play", variant: "primary", action: { kind: "playPart", partId: "ep-1" } } },
          { type: "Button", props: { label: "Sources", variant: "secondary", action: { kind: "openOverlay", surface: "sheet", node: sourcesSheet } } },
          { type: "IconButton", props: { icon: "plus", label: "Add to list" } },
        ],
      },
    },
    { type: "SeasonSelector", props: { seasons: [{ id: "s1", label: "Season 1" }, { id: "s2", label: "Session 2 (film)" }] } },
    {
      type: "Section",
      props: { title: "Episodes" },
      children: [
        { type: "EpisodeRow", props: { index: 1, title: "Asteroid Blues", runtime: "24m", watched: true, overview: "Spike and Jet chase a bounty on Tijuana.", action: { kind: "playPart", partId: "ep-1" } } },
        { type: "EpisodeRow", props: { index: 2, title: "Stray Dog Strut", runtime: "24m", watched: true, overview: "A data dog worth 8 million woolongs.", action: { kind: "playPart", partId: "ep-2" } } },
        { type: "EpisodeRow", props: { index: 3, title: "Honky Tonk Women", runtime: "24m", overview: "Faye Valentine enters the picture.", action: { kind: "playPart", partId: "ep-3" } } },
      ],
    },
    {
      type: "Section",
      props: { title: "Cast" },
      children: [
        {
          type: "Stack",
          props: { direction: "horizontal", gap: 3, wrap: true },
          children: [
            { type: "PersonChip", props: { name: "Kōichi Yamadera", role: "Spike Spiegel" } },
            { type: "PersonChip", props: { name: "Unshō Ishizuka", role: "Jet Black" } },
            { type: "PersonChip", props: { name: "Megumi Hayashibara", role: "Faye Valentine" } },
          ],
        },
      ],
    },
    {
      type: "RelatedRail",
      props: { title: "More like this" },
      children: [posterCard("Samurai Champloo", "Anime Series"), posterCard("Trigun", "Anime Series"), posterCard("Outlaw Star", "Anime Series")],
    },
  ],
};

const browse: UINode = {
  type: "Screen",
  props: { title: "Browse", subtitle: "Everything in your library" },
  children: [
    {
      type: "Grid",
      children: [
        posterCard("Cowboy Bebop", "Anime Series"),
        posterCard("Dune", "Film"),
        posterCard("Frieren", "Anime Series"),
        posterCard("Severance", "Series"),
        posterCard("Akira", "Anime Film"),
        posterCard("Foundation", "Series"),
        posterCard("Pluto", "Anime Series"),
        posterCard("Arrival", "Film"),
        posterCard("Vinland Saga", "Anime Series"),
        posterCard("Blade Runner 2049", "Film"),
      ],
    },
    { type: "Pagination", props: { page: 1, pages: 6, screen: "browse" } },
  ],
};

const search: UINode = {
  type: "Screen",
  props: { title: "Search" },
  children: [
    { type: "SearchBar", props: { placeholder: "Search titles, people, genres…" } },
    { type: "Spacer", props: { size: 4 } },
    {
      type: "EmptyState",
      props: { icon: "search", title: "Search your library", message: "Results are served by the Platform's content search services." },
    },
  ],
};

const moduleSettings: UINode = {
  type: "Screen",
  props: { title: "Stremio module", subtitle: "User-managed settings (ADR 0021)" },
  children: [
    { type: "Banner", props: { tone: "info", message: "These settings are stored opaquely by the Platform and handed to the module on invocation." } },
    { type: "Spacer", props: { size: 3 } },
    {
      type: "Stack",
      props: { gap: 5 },
      children: [
        { type: "TextField", props: { label: "Addon manifest URL", placeholder: "https://…/manifest.json", help: "Paste a Stremio addon manifest URL to source content from it." } },
        { type: "Toggle", props: { label: "Include remote streams", value: true } },
        { type: "Select", props: { label: "Preferred quality", options: [{ value: "auto", label: "Auto" }, { value: "1080", label: "1080p" }, { value: "720", label: "720p" }] } },
        { type: "Slider", props: { label: "Result limit", min: 5, max: 100, value: 40 } },
        {
          type: "Stack",
          props: { direction: "horizontal", gap: 3 },
          children: [
            { type: "Button", props: { label: "Save", icon: "check", variant: "primary", action: { kind: "toast", message: "Settings saved (demo)", tone: "success" } } },
            { type: "Button", props: { label: "Cancel", variant: "ghost", action: { kind: "back" } } },
          ],
        },
      ],
    },
  ],
};

export const SCREENS: Record<string, UINode> = {
  home,
  detail,
  browse,
  search,
  settings: moduleSettings,
};

export const NAV_ITEMS: Array<{ screen: string; label: string; icon: "grid" | "search" | "list" | "play" }> = [
  { screen: "home", label: "Home", icon: "play" },
  { screen: "browse", label: "Browse", icon: "grid" },
  { screen: "search", label: "Search", icon: "search" },
  { screen: "settings", label: "Settings", icon: "list" },
];
