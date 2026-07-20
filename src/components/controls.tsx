// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Interactive controls — the native leaves. Form controls (needed for module
 * settings — ADR 0021 — and admin config) are stateful and emit an Action on
 * change; Menu/Pagination carry local state too. Button and IconButton, being
 * stateless, are now primitive definitions (components/definitions.ts). All read
 * tokens, none hardcode colour.
 */

import { useId, useState } from "react";
import type { Action, UINode } from "@/sdui/types";
import { prop } from "@/sdui/registry";
import { useRuntime } from "@/sdui/context";
import { cx, Icon, type IconName } from "./shared";

/** Menu — a click-to-open list of actionable items. */
export function Menu({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const [open, setOpen] = useState(false);
  const label = prop<string>(node, "label", "Menu");
  const items = prop<Array<{ label: string; icon?: IconName; action?: Action; tone?: string }>>(
    node,
    "items",
    [],
  );
  return (
    <div className={cx("msc-menu", open && "is-open")} onMouseLeave={() => setOpen(false)}>
      <button className="msc-iconbtn msc-iconbtn--ghost" aria-label={label} onClick={() => setOpen((o) => !o)}>
        <Icon name="dots" />
      </button>
      {open && (
        <div className="msc-menu__list" role="menu">
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              className={cx("msc-menu__item", it.tone === "danger" && "is-danger")}
              onClick={() => {
                setOpen(false);
                emit(it.action);
              }}
            >
              {it.icon && <Icon name={it.icon} />}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** SearchBar — emits a `query`/`navigate` action carrying the term on submit. */
export function SearchBar({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const placeholder = prop<string>(node, "placeholder", "Search your library…");
  const screen = prop<string>(node, "submitScreen", "search");
  const [value, setValue] = useState(prop<string>(node, "value", ""));
  return (
    <form
      className="msc-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        emit({ kind: "navigate", screen, params: { q: value } });
      }}
    >
      <Icon name="search" className="msc-search__icon" />
      <input
        className="msc-search__input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  );
}

export function TextField({ node }: { node: UINode }) {
  const id = useId();
  const label = prop<string | undefined>(node, "label", undefined);
  const placeholder = prop<string>(node, "placeholder", "");
  const help = prop<string | undefined>(node, "help", undefined);
  const kind = prop<string>(node, "inputType", "text");
  const [value, setValue] = useState(prop<string>(node, "value", ""));
  return (
    <div className="msc-field">
      {label && (
        <label className="msc-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className="msc-field__input"
        type={kind}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {help && <p className="msc-field__help">{help}</p>}
    </div>
  );
}

export function Toggle({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const label = prop<string | undefined>(node, "label", undefined);
  const action = prop<Action | undefined>(node, "action", undefined);
  const [on, setOn] = useState(prop<boolean>(node, "value", false));
  return (
    <label className="msc-toggle">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={cx("msc-toggle__track", on && "is-on")}
        onClick={() => {
          setOn((v) => !v);
          emit(action);
        }}
      >
        <span className="msc-toggle__thumb" />
      </button>
      {label && <span className="msc-toggle__label">{label}</span>}
    </label>
  );
}

export function Select({ node }: { node: UINode }) {
  const id = useId();
  const label = prop<string | undefined>(node, "label", undefined);
  const options = prop<Array<{ value: string; label: string }>>(node, "options", []);
  const [value, setValue] = useState(prop<string>(node, "value", options[0]?.value ?? ""));
  return (
    <div className="msc-field">
      {label && (
        <label className="msc-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="msc-select">
        <select id={id} className="msc-select__el" value={value} onChange={(e) => setValue(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="msc-select__chevron" />
      </div>
    </div>
  );
}

export function Slider({ node }: { node: UINode }) {
  const label = prop<string | undefined>(node, "label", undefined);
  const min = prop<number>(node, "min", 0);
  const max = prop<number>(node, "max", 100);
  const [value, setValue] = useState(prop<number>(node, "value", 50));
  return (
    <div className="msc-field">
      {label && (
        <div className="msc-field__label msc-slider__label">
          <span>{label}</span>
          <span className="msc-slider__value">{value}</span>
        </div>
      )}
      <input
        className="msc-slider"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
}

/** RatingControl — clickable stars. Read-only when no action given. */
export function RatingControl({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const max = prop<number>(node, "max", 5);
  const action = prop<Action | undefined>(node, "action", undefined);
  const [value, setValue] = useState(prop<number>(node, "value", 0));
  return (
    <div className="msc-rating" role="slider" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          className={cx("msc-rating__star", n <= value && "is-filled")}
          aria-label={`${n} of ${max}`}
          onClick={() => {
            setValue(n);
            emit(action);
          }}
        >
          <Icon name="star" />
        </button>
      ))}
    </div>
  );
}

/** ProgressBar — watched progress / loading determinate state. */
export function ProgressBar({ node }: { node: UINode }) {
  const value = Math.max(0, Math.min(1, prop<number>(node, "value", 0)));
  const tone = prop<string>(node, "tone", "accent");
  return (
    <div className="msc-progress" role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <div
        className={cx("msc-progress__fill", `msc-progress__fill--${tone}`)}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}

// Pagination is now a definition (server supplies prev/next actions) — see
// components/definitions.layout.ts.
