// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * SeasonSelector — a stateful PRIMITIVE (a segmented control that owns its
 * active selection). Every other media component, including RelatedRail, is now
 * a definition (components/definitions.ts, definitions.layout.ts).
 */

import type { Action, UINode } from "../sdui/types";
import { prop } from "../sdui/registry";
import { useRuntime } from "../sdui/context";
import { useState } from "react";
import { cx } from "./shared";

export function SeasonSelector({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const seasons = prop<Array<{ id: string; label: string; action?: Action }>>(node, "seasons", []);
  // `selected` lets the server keep the highlight in step with the season it
  // rendered (a season switch re-navigates); absent, it defaults to the first.
  const [active, setActive] = useState(prop<string | undefined>(node, "selected", undefined) ?? seasons[0]?.id);
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
