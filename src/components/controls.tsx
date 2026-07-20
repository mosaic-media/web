// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Interactive PRIMITIVES. Each stays native for one concrete reason a static
 * data tree can't overcome:
 *   - TextInput/SelectInput/Switch — own their input value (local state)
 *   - Menu                          — owns open/closed state
 *   - SearchBar                     — the submit Action must carry the live
 *                                     input value (state → action payload)
 *   - Slider                        — displays its own live value beside itself
 *                                     (output couples to internal state)
 *   - RatingControl                 — owns selection state
 *   - ProgressBar                   — fill width is computed from `value`
 *
 * The LABELLED form controls (TextField/Toggle/Select) were compositions of a
 * bare input + static chrome, so they moved to definitions (definitions.ts).
 */

import { useEffect, useRef, useState } from "react";
import type { Action, UINode } from "../sdui/types";
import { prop } from "../sdui/registry";
import { useRuntime } from "../sdui/context";
import { cx, Icon, type IconName } from "./shared";

/** TextInput — bare text field owning its value. */
export function TextInput({ node }: { node: UINode }) {
  const kind = prop<string>(node, "inputType", "text");
  const placeholder = prop<string>(node, "placeholder", "");
  const [value, setValue] = useState(prop<string>(node, "value", ""));
  return (
    <input
      className="msc-field__input"
      type={kind}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

/** Switch — bare on/off toggle owning its state; emits an Action on change. */
export function Switch({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const action = prop<Action | undefined>(node, "action", undefined);
  const [on, setOn] = useState(prop<boolean>(node, "value", false));
  return (
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
  );
}

/** SelectInput — bare dropdown owning its value. */
export function SelectInput({ node }: { node: UINode }) {
  const options = prop<Array<{ value: string; label: string }>>(node, "options", []);
  const [value, setValue] = useState(prop<string>(node, "value", options[0]?.value ?? ""));
  return (
    <div className="msc-select">
      <select className="msc-select__el" value={value} onChange={(e) => setValue(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" className="msc-select__chevron" />
    </div>
  );
}

/** Menu — a click-to-open list of actionable items. */
export function Menu({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const [open, setOpen] = useState(false);
  const label = prop<string>(node, "label", "Menu");
  const items = prop<Array<{ label: string; icon?: IconName; action?: Action; tone?: string }>>(node, "items", []);
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

/** SearchBar — the submit Action carries the live term, so it owns its input. */
export function SearchBar({ node }: { node: UINode }) {
  const { emit, input } = useRuntime();
  const placeholder = prop<string>(node, "placeholder", "Search your library…");
  const screen = prop<string>(node, "submitScreen", "search");
  const [value, setValue] = useState(prop<string>(node, "value", ""));
  // In a live session, stream the value up as it changes, debounced so a fast
  // typist does not fan a request out per keystroke (ADR 0032).
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <form
      className="msc-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (input) input(value);
        else emit({ kind: "navigate", screen, params: { text: value } });
      }}
    >
      <Icon name="search" className="msc-search__icon" />
      <input
        className="msc-search__input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          if (input) {
            clearTimeout(timer.current);
            timer.current = setTimeout(() => input(v), 220);
          }
        }}
      />
    </form>
  );
}

/** Slider — shows its own live value, so output couples to internal state. */
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
      <input className="msc-slider" type="range" min={min} max={max} value={value} onChange={(e) => setValue(Number(e.target.value))} />
    </div>
  );
}

/** RatingControl — clickable stars owning the selection. */
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

/** ProgressBar — fill width computed from `value` (0..1). */
export function ProgressBar({ node }: { node: UINode }) {
  const value = Math.max(0, Math.min(1, prop<number>(node, "value", 0)));
  const tone = prop<string>(node, "tone", "accent");
  return (
    <div className="msc-progress" role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <div className={cx("msc-progress__fill", `msc-progress__fill--${tone}`)} style={{ width: `${value * 100}%` }} />
    </div>
  );
}

/** ProgressRing — circular progress with the percentage in the centre. The arc
 *  is computed from `value` (0..1), so like ProgressBar it stays native. */
export function ProgressRing({ node }: { node: UINode }) {
  const value = Math.max(0, Math.min(1, prop<number>(node, "value", 0)));
  const size = prop<number>(node, "size", 84);
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="msc-ring" style={{ width: size, height: size }} role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="msc-ring__track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="msc-ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="msc-ring__value">{Math.round(value * 100)}%</span>
    </div>
  );
}
