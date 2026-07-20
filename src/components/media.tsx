// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Media-domain components. Each renders a piece of the Platform's content model:
 *   PosterCard    → a Node (work/collection/item)
 *   HeroBanner    → a featured Node
 *   EpisodeRow    → a Part under a series Node
 *   DetailHeader  → a Node's metadata
 *   SeasonSelector→ navigates Relation structure (work → children)
 *   RelatedRail   → Relation-derived rail (see the relation-read note below)
 *   SourcePicker  → SourceBinding + RemoteLocation stream Parts
 *   PlaybackBar   → resume / now-playing state
 *   PersonChip /
 *   GenreTag      → vocabulary-driven chips
 *
 * They compose the primitives; they never fetch. Data arrives as props from the
 * server payload.
 */

import type { Action, UINode } from "@/sdui/types";
import { prop } from "@/sdui/registry";
import { Children, Slot, hasSlot } from "@/sdui/Renderer";
import { useRuntime } from "@/sdui/context";
import { useState } from "react";
import { cx, Icon } from "./shared";
import { ProgressBar } from "./controls";

/** Small helper: render a poster image or a typed placeholder. */
function Poster({ src, alt, kind }: { src?: string; alt: string; kind?: string }) {
  if (src) return <img className="msc-poster__img" src={src} alt={alt} loading="lazy" />;
  return (
    <div className="msc-poster__placeholder" aria-hidden>
      <span>{(kind ?? "media").slice(0, 12)}</span>
    </div>
  );
}

export function PosterCard({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const title = prop<string>(node, "title", "Untitled");
  const subtitle = prop<string | undefined>(node, "subtitle", undefined);
  const mediaType = prop<string | undefined>(node, "mediaType", undefined);
  const poster = prop<string | undefined>(node, "poster", undefined);
  const progress = prop<number | undefined>(node, "progress", undefined);
  const badge = prop<string | undefined>(node, "badge", undefined);
  const action = prop<Action | undefined>(node, "action", undefined);
  return (
    <button className="msc-poster" onClick={() => emit(action)}>
      <div className="msc-poster__art">
        <Poster src={poster} alt={title} kind={mediaType} />
        {badge && <span className="msc-poster__badge">{badge}</span>}
        <span className="msc-poster__play" aria-hidden>
          <Icon name="play" />
        </span>
        {progress !== undefined && (
          <div className="msc-poster__progress">
            <ProgressBar node={{ type: "ProgressBar", props: { value: progress } }} />
          </div>
        )}
      </div>
      <div className="msc-poster__meta">
        <span className="msc-poster__title">{title}</span>
        {subtitle && <span className="msc-poster__subtitle">{subtitle}</span>}
      </div>
    </button>
  );
}

export function HeroBanner({ node }: { node: UINode }) {
  const title = prop<string>(node, "title", "");
  const overview = prop<string | undefined>(node, "overview", undefined);
  const backdrop = prop<string | undefined>(node, "backdrop", undefined);
  const meta = prop<string[]>(node, "meta", []);
  return (
    <div className="msc-hero">
      <div className="msc-hero__bg">
        {backdrop ? <img src={backdrop} alt="" aria-hidden /> : <div className="msc-hero__bg-fallback" />}
        <div className="msc-hero__scrim" />
      </div>
      <div className="msc-hero__content">
        {hasSlot(node, "logo") ? <Slot node={node} name="logo" /> : <h1 className="msc-hero__title">{title}</h1>}
        {meta.length > 0 && (
          <div className="msc-hero__meta">
            {meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        )}
        {overview && <p className="msc-hero__overview">{overview}</p>}
        {hasSlot(node, "actions") && (
          <div className="msc-hero__actions">
            <Slot node={node} name="actions" />
          </div>
        )}
      </div>
    </div>
  );
}

export function EpisodeRow({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const index = prop<number | undefined>(node, "index", undefined);
  const title = prop<string>(node, "title", "Untitled");
  const runtime = prop<string | undefined>(node, "runtime", undefined);
  const overview = prop<string | undefined>(node, "overview", undefined);
  const thumbnail = prop<string | undefined>(node, "thumbnail", undefined);
  const watched = prop<boolean>(node, "watched", false);
  const action = prop<Action | undefined>(node, "action", undefined);
  return (
    <button className={cx("msc-episode", watched && "is-watched")} onClick={() => emit(action)}>
      <div className="msc-episode__thumb">
        {thumbnail ? <img src={thumbnail} alt="" loading="lazy" /> : <div className="msc-episode__thumb-fallback" />}
        <span className="msc-episode__play" aria-hidden>
          <Icon name="play" />
        </span>
      </div>
      <div className="msc-episode__body">
        <div className="msc-episode__head">
          <span className="msc-episode__title">
            {index !== undefined && <span className="msc-episode__num">{index}</span>}
            {title}
          </span>
          {runtime && <span className="msc-episode__runtime">{runtime}</span>}
        </div>
        {overview && <p className="msc-episode__overview">{overview}</p>}
      </div>
      {watched && <Icon name="check" className="msc-episode__watched" />}
    </button>
  );
}

export function DetailHeader({ node }: { node: UINode }) {
  const title = prop<string>(node, "title", "");
  const year = prop<string | undefined>(node, "year", undefined);
  const mediaType = prop<string | undefined>(node, "mediaType", undefined);
  const rating = prop<string | undefined>(node, "rating", undefined);
  const genres = prop<string[]>(node, "genres", []);
  const overview = prop<string | undefined>(node, "overview", undefined);
  const poster = prop<string | undefined>(node, "poster", undefined);
  return (
    <div className="msc-detail">
      <div className="msc-detail__poster">
        <Poster src={poster} alt={title} kind={mediaType} />
      </div>
      <div className="msc-detail__body">
        <h1 className="msc-detail__title">{title}</h1>
        <div className="msc-detail__facts">
          {year && <span>{year}</span>}
          {mediaType && <span className="msc-detail__type">{mediaType}</span>}
          {rating && (
            <span className="msc-detail__rating">
              <Icon name="star" /> {rating}
            </span>
          )}
        </div>
        {genres.length > 0 && (
          <div className="msc-detail__genres">
            {genres.map((g, i) => (
              <span key={i} className="msc-tag">
                {g}
              </span>
            ))}
          </div>
        )}
        {overview && <p className="msc-detail__overview">{overview}</p>}
        {hasSlot(node, "actions") && (
          <div className="msc-detail__actions">
            <Slot node={node} name="actions" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SeasonSelector({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const seasons = prop<Array<{ id: string; label: string; action?: Action }>>(node, "seasons", []);
  const [active, setActive] = useState(seasons[0]?.id);
  return (
    <div className="msc-seasons" role="tablist">
      {seasons.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={active === s.id}
          className={cx("msc-seasons__pill", active === s.id && "is-active")}
          onClick={() => {
            setActive(s.id);
            emit(s.action);
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/**
 * RelatedRail — a rail of related Nodes (adaptations, "more like this").
 * NOTE: ContentService cannot yet read relations back (no ListFrom/ListTo on
 * the published v1 surface — see roadmap). Until that lands the server can only
 * populate this from data it already holds; an empty rail renders a hint.
 */
export function RelatedRail({ node }: { node: UINode }) {
  const title = prop<string>(node, "title", "Related");
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <section className="msc-section">
      <div className="msc-section__head">
        <h2 className="msc-section__title">{title}</h2>
      </div>
      {hasChildren ? (
        <div className="msc-carousel" style={{ ["--msc-rail-item" as string]: "168px" }}>
          <div className="msc-carousel__track">
            <Children nodes={node.children} />
          </div>
        </div>
      ) : (
        <p className="msc-related__empty">No related titles yet.</p>
      )}
    </section>
  );
}

/**
 * SourcePicker — surfaces SourceBindings and RemoteLocation stream Parts (e.g.
 * Stremio addon results). A meta-only source yields none, and that's valid:
 * metadata can enrich local media without any stream to play.
 */
export function SourcePicker({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const sources = prop<
    Array<{ label: string; provider?: string; quality?: string; kind?: string; action?: Action }>
  >(node, "sources", []);
  if (sources.length === 0) {
    return <p className="msc-sources__empty">No playable sources — metadata only.</p>;
  }
  return (
    <div className="msc-sources">
      {sources.map((s, i) => (
        <button key={i} className="msc-source" onClick={() => emit(s.action)}>
          <Icon name="play" className="msc-source__icon" />
          <span className="msc-source__label">{s.label}</span>
          {s.quality && <span className="msc-source__quality">{s.quality}</span>}
          {s.provider && <span className="msc-source__provider">{s.provider}</span>}
        </button>
      ))}
    </div>
  );
}

export function PlaybackBar({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const title = prop<string>(node, "title", "");
  const subtitle = prop<string | undefined>(node, "subtitle", undefined);
  const progress = prop<number>(node, "progress", 0);
  const action = prop<Action | undefined>(node, "action", undefined);
  return (
    <div className="msc-playbar">
      <button className="msc-playbar__play" aria-label="Resume" onClick={() => emit(action)}>
        <Icon name="play" />
      </button>
      <div className="msc-playbar__body">
        <div className="msc-playbar__titles">
          <span className="msc-playbar__title">{title}</span>
          {subtitle && <span className="msc-playbar__subtitle">{subtitle}</span>}
        </div>
        <ProgressBar node={{ type: "ProgressBar", props: { value: progress } }} />
      </div>
    </div>
  );
}

export function PersonChip({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const name = prop<string>(node, "name", "");
  const role = prop<string | undefined>(node, "role", undefined);
  const avatar = prop<string | undefined>(node, "avatar", undefined);
  const action = prop<Action | undefined>(node, "action", undefined);
  return (
    <button className="msc-person" onClick={() => emit(action)}>
      <span className="msc-person__avatar">
        {avatar ? <img src={avatar} alt="" loading="lazy" /> : <span aria-hidden>{name.slice(0, 1)}</span>}
      </span>
      <span className="msc-person__text">
        <span className="msc-person__name">{name}</span>
        {role && <span className="msc-person__role">{role}</span>}
      </span>
    </button>
  );
}

export function GenreTag({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const label = prop<string>(node, "label", "");
  const action = prop<Action | undefined>(node, "action", undefined);
  if (!action) return <span className="msc-tag">{label}</span>;
  return (
    <button className="msc-tag msc-tag--action" onClick={() => emit(action)}>
      {label}
    </button>
  );
}
