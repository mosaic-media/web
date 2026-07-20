// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Media-domain components that stay NATIVE. The presentational ones — PosterCard,
 * HeroBanner, EpisodeRow, DetailHeader, PersonChip, GenreTag, SourcePicker,
 * PlaybackBar — are now primitive definitions (components/definitions.ts).
 *
 * These two remain native because a static primitive template can't express
 * them: SeasonSelector holds local selection state; RelatedRail branches on how
 * many children it was given (a count predicate the template language lacks).
 */

import type { Action, UINode } from "@/sdui/types";
import { prop } from "@/sdui/registry";
import { Children } from "@/sdui/Renderer";
import { useRuntime } from "@/sdui/context";
import { useState } from "react";
import { cx } from "./shared";

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
 * populate this from data it already holds; an empty rail renders a hint. That
 * empty-vs-populated branch is why this stays native (a template can't count
 * the children it was handed).
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
