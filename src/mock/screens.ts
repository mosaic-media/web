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

import type { UINode } from "@mosaic-media/sdui-react";

// Local showcase artwork, keyed by title. Same-origin so the artlight canvas
// sampler can read it without tainting. Titles absent here keep the placeholder
// and the ambient wash falls back to the accent duo.
const ART: Record<string, string> = {
  "Cowboy Bebop": "/art/cowboy-bebop.svg",
  Dune: "/art/dune.svg",
  Severance: "/art/severance.svg",
  Frieren: "/art/frieren.svg",
  "Blade Runner 2049": "/art/blade-runner.svg",
  "Chainsaw Man": "/art/chainsaw-man.svg",
  "Your Name": "/art/your-name.svg",
};

const nav = (screen: string, params?: Record<string, unknown>): UINode["props"] => ({
  action: { kind: "navigate", screen, params },
});

const posterCard = (title: string, mediaType: string, extra: Record<string, unknown> = {}): UINode => ({
  type: "PosterCard",
  props: { title, mediaType, ...(ART[title] ? { poster: ART[title] } : {}), ...nav("detail", { title }), ...extra },
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

// ── concept-layout home: hero card + info aside, season episode rail, and a
//    Top Cast / You May Also Like / My Progress panel row — all composed from
//    the standard SDUI vocabulary (no bespoke components).

const infoRow = (label: string, value: string): UINode => ({
  type: "Box",
  props: { style: { direction: "row", align: "center", justify: "between", gap: 3 } },
  children: [
    { type: "Text", props: { text: label, style: { variant: "xs", color: "text-muted" } } },
    { type: "Text", props: { text: value, style: { variant: "xs", weight: "medium" } } },
  ],
});

const ratingRow = (value: string, source: string): UINode => ({
  type: "Box",
  props: { style: { direction: "row", align: "center", gap: 3 } },
  children: [
    { type: "Icon", props: { name: "star", color: "rating", size: 18 } },
    {
      type: "Box",
      children: [
        { type: "Text", props: { text: value, style: { variant: "lg", weight: "bold" } } },
        { type: "Text", props: { text: source, style: { variant: "xs", color: "text-faint" } } },
      ],
    },
  ],
});

const heroAside: UINode = {
  type: "Box",
  props: { style: { minWidth: 235, p: 4, gap: 3, radius: "lg", bg: "surface", glass: true, border: true, shadow: "2" } },
  children: [
    ratingRow("8.9", "AniList"),
    ratingRow("9.0", "IMDb"),
    { type: "Divider" },
    { type: "Text", props: { text: "Information", style: { variant: "xs", color: "text-faint", transform: "uppercase" } } },
    infoRow("Studio", "Sunrise"),
    infoRow("Source", "Original"),
    infoRow("Episodes", "26"),
    infoRow("Status", "Ended"),
  ],
};

const episodeCard = (n: number, title: string, runtime: string, art: string): UINode => ({
  type: "Pressable",
  props: {
    action: { kind: "playPart", partId: `ep-${n}` },
    lift: true,
    style: { position: "relative", radius: "md", overflow: "hidden", aspectRatio: "16 / 9", bg: "surface-raised", border: true },
  },
  children: [
    { type: "Image", props: { src: art, fit: "cover", style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "full", height: "full" } } },
    {
      type: "Box",
      props: { style: { position: "absolute", top: 2, left: 2, bg: "surface-overlay", glass: true, radius: "sm", px: 2, py: 1, border: true } },
      children: [{ type: "Text", props: { text: String(n), style: { variant: "xs", weight: "bold" } } }],
    },
    {
      type: "Box",
      props: { style: { position: "absolute", left: 0, right: 0, bottom: 0, bgGradient: { from: "bg", to: "transparent", angle: 0 }, p: 3, pt: 5 } },
      children: [
        { type: "Text", props: { text: title, style: { variant: "sm", weight: "medium", lineClamp: 1 } } },
        { type: "Text", props: { text: runtime, style: { variant: "xs", color: "text-muted" } } },
      ],
    },
  ],
});

const panel = (title: string, children: UINode[]): UINode => ({
  type: "Box",
  props: { style: { flex: 1, minWidth: 280, p: 5, gap: 4, radius: "xl", bg: "surface", border: true } },
  children: [{ type: "Text", props: { text: title, style: { weight: "bold" } } }, ...children],
});

const miniPoster = (title: string): UINode => ({
  type: "Pressable",
  props: {
    action: { kind: "navigate", screen: "detail", params: { title } },
    lift: true,
    label: title,
    style: { position: "relative", width: 76, aspectRatio: "2 / 3", radius: "sm", overflow: "hidden", bg: "surface-raised", border: true },
  },
  children: [
    { type: "Image", props: { src: ART[title], fit: "cover", placeholder: title, style: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "full", height: "full" } } },
  ],
});

const home: UINode = {
  type: "Screen",
  children: [
    {
      type: "HeroBanner",
      props: {
        kicker: "Continue watching",
        title: "Cowboy Bebop",
        nativeTitle: "カウボーイビバップ",
        backdrop: "/art/hero-bebop.svg",
        meta: ["1998", "TV-14", "Action, Sci-Fi, Space Western", "1 Season"],
        overview:
          "The bounty-hunting adventures of the Bebop crew as they chase down the galaxy's most dangerous criminals — for cash they'll spend before the next job.",
      },
      slots: {
        actions: [
          { type: "Button", props: { label: "Resume S1 E12", icon: "play", variant: "primary", action: { kind: "playPart", partId: "ep-12" } } },
          { type: "Button", props: { label: "Watchlist", icon: "plus", variant: "secondary", action: { kind: "toast", message: "Added to watchlist", tone: "success" } } },
          { type: "Button", props: { label: "Details", variant: "secondary", ...nav("detail", { title: "Cowboy Bebop" }) } },
        ],
        aside: heroAside,
      },
    },
    {
      type: "Stack",
      props: { gap: 3 },
      children: [
        {
          type: "Box",
          props: { style: { direction: "row", align: "center", justify: "between", gap: 3, wrap: true } },
          children: [
            { type: "SeasonSelector", props: { seasons: [{ id: "s1", label: "Season 1" }, { id: "film", label: "The Movie" }] } },
            { type: "Pagination", props: { label: "", hasPrev: false, hasNext: true, nextAction: { kind: "toast", message: "More episodes" } } },
          ],
        },
        {
          type: "Carousel",
          props: { itemWidth: 260 },
          children: [
            episodeCard(10, "Ganymede Elegy", "24m", "/art/bebop-ep1.svg"),
            episodeCard(11, "Toys in the Attic", "24m", "/art/bebop-ep2.svg"),
            episodeCard(12, "Jupiter Jazz (Part 1)", "24m", "/art/bebop-ep3.svg"),
            episodeCard(13, "Jupiter Jazz (Part 2)", "24m", "/art/bebop-ep4.svg"),
            episodeCard(14, "Bohemian Rhapsody", "24m", "/art/bebop-ep5.svg"),
          ],
        },
      ],
    },
    {
      type: "Box",
      props: { style: { direction: "row", gap: 4, wrap: true } },
      children: [
        panel("Top Cast", [
          {
            type: "Stack",
            props: { gap: 2 },
            children: [
              { type: "PersonChip", props: { name: "Kōichi Yamadera", role: "Spike Spiegel" } },
              { type: "PersonChip", props: { name: "Unshō Ishizuka", role: "Jet Black" } },
              { type: "PersonChip", props: { name: "Megumi Hayashibara", role: "Faye Valentine" } },
            ],
          },
        ]),
        panel("You May Also Like", [
          {
            type: "Stack",
            props: { direction: "horizontal", gap: 3, wrap: true },
            children: [miniPoster("Chainsaw Man"), miniPoster("Your Name"), miniPoster("Blade Runner 2049"), miniPoster("Frieren")],
          },
        ]),
        panel("My Progress", [
          {
            type: "Box",
            props: { style: { direction: "row", align: "center", gap: 5 } },
            children: [
              { type: "ProgressRing", props: { value: 0.46 } },
              {
                type: "Box",
                props: { style: { gap: 1 } },
                children: [
                  { type: "Text", props: { text: "Last watched", style: { variant: "xs", color: "text-faint", transform: "uppercase" } } },
                  { type: "Text", props: { text: "S1 E12 · Jupiter Jazz", style: { variant: "sm", weight: "medium" } } },
                  { type: "Text", props: { text: "12 of 26 episodes", style: { variant: "xs", color: "text-muted" } } },
                ],
              },
            ],
          },
          { type: "Button", props: { label: "Continue watching", icon: "play", variant: "primary", action: { kind: "playPart", partId: "ep-12" } } },
        ]),
      ],
    },
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
        poster: "/art/cowboy-bebop.svg",
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
    {
      type: "Pagination",
      props: {
        label: "1 / 6",
        hasPrev: false,
        hasNext: true,
        prevAction: { kind: "navigate", screen: "browse", params: { page: 0 } },
        nextAction: { kind: "navigate", screen: "browse", params: { page: 2 } },
      },
    },
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

export const NAV_ITEMS: Array<{ screen: string; label: string; icon: "home" | "grid" | "search" | "list" | "play" }> = [
  { screen: "home", label: "Home", icon: "home" },
  { screen: "search", label: "Search", icon: "search" },
  { screen: "collections", label: "Collections", icon: "list" },
];
