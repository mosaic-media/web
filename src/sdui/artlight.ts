// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Art-light — the runtime half of the "refraction" language: the artwork in
 * focus is the light source, and the UI's ambient wash takes its colour.
 *
 * A source image is sampled on a tiny canvas for a few vibrant, distinct
 * colours; those are written to the --art-glow-* custom properties that
 * tokens.css feeds into --ambient. tokens.css registers those properties as
 * <color> and transitions them, so the wash cross-fades as focus moves. When
 * nothing is in focus the inline values are removed and the tokens fall back to
 * the default accent duo.
 *
 * This is a WEB runtime concern (canvas + CSS vars), deliberately kept out of
 * the portable primitive style vocabulary. Another client would satisfy the
 * same contract its own way, or omit it — the fallback duo is always valid.
 */

export type Rgb = [number, number, number];

const GLOW_VARS = ["--art-glow-1", "--art-glow-2", "--art-glow-3"] as const;
const ACCENT_VARS = ["--accent-rgb", "--accent-2-rgb"] as const;

/* Per-theme alpha for each ambient (background) glow layer — mirrors the token
   defaults so a sampled palette sits at the same intensity as the fallback duo. */
const ALPHA_DARK = [0.24, 0.16, 0.11];
const ALPHA_LIGHT = [0.5, 0.42, 0.34];

/* Target saturation/lightness the sampled hue is re-toned to before it becomes
   the UI accent. Fixing S/L keeps buttons, nav and focus rings legible whatever
   the artwork looks like — only the HUE travels. */
const TONE_DARK = { s: 0.9, l: 0.7 };
const TONE_LIGHT = { s: 0.85, l: 0.6 };

/** The standing ambient source (typically the hero art of the current screen). */
let ambient: Rgb[] | null = null;

const root = () => (typeof document === "undefined" ? null : document.documentElement);

function isLight(): boolean {
  return root()?.dataset.theme === "light";
}

function alphas(): number[] {
  return isLight() ? ALPHA_LIGHT : ALPHA_DARK;
}

/**
 * Write (or, with null, clear) the art-light vars:
 *  - --art-glow-1/2/3 : the raw vibrant palette, at the ambient background alpha
 *  - --accent-rgb / --accent-2-rgb : the two lead hues re-toned to a legible
 *    accent, which retints every accent-derived surface (buttons, nav, glows…)
 * Clearing removes all of them so the tokens fall back to the brand duo.
 */
function paint(colors: Rgb[] | null): void {
  const el = root();
  if (!el) return;
  if (!colors || colors.length === 0) {
    [...GLOW_VARS, ...ACCENT_VARS].forEach((v) => el.style.removeProperty(v));
    return;
  }
  const a = alphas();
  GLOW_VARS.forEach((v, i) => {
    const c = colors[Math.min(i, colors.length - 1)];
    el.style.setProperty(v, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a[i]})`);
  });

  const tone = isLight() ? TONE_LIGHT : TONE_DARK;
  const h1 = rgbToHsl(...colors[0])[0];
  const h2 = colors[1] ? rgbToHsl(...colors[1])[0] : (h1 + 35) % 360;
  el.style.setProperty("--accent-rgb", hslToRgb(h1, tone.s, tone.l).join(", "));
  el.style.setProperty("--accent-2-rgb", hslToRgb(h2, tone.s, tone.l).join(", "));
}

// ── colour maths ──────────────────────────────────────────────────────────
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Sample up to `max` vibrant, hue-distinct colours from a loaded, origin-clean
 * image. Returns null if the canvas is unreadable (tainted / not ready) or the
 * image has no colour worth reflecting — the caller then keeps the duo.
 */
export function sampleArtColors(img: HTMLImageElement, max = 3): Rgb[] | null {
  const W = 24;
  const H = 36;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    // Accumulate into 12 coarse hue buckets, weighted toward vivid pixels.
    type Bucket = { r: number; g: number; b: number; w: number };
    const buckets = new Map<number, Bucket>();
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 128) continue;
      const [h, s, v] = rgbToHsv(r, g, b);
      if (v < 0.16 || s < 0.12) continue; // skip near-black and near-grey
      const w = s * s * v; // favour saturated, lit pixels
      const key = Math.round(h / 30) % 12;
      const acc = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
      acc.r += r * w;
      acc.g += g * w;
      acc.b += b * w;
      acc.w += w;
      buckets.set(key, acc);
    }
    if (buckets.size === 0) return null;

    const ranked = [...buckets.values()]
      .sort((p, q) => q.w - p.w)
      .slice(0, max)
      .map<Rgb>((bkt) => vivify(bkt.r / bkt.w, bkt.g / bkt.w, bkt.b / bkt.w));
    return ranked.length ? ranked : null;
  } catch {
    return null;
  }
}

/** Nudge a sampled mean toward the vivid edge so the glow reads clearly. */
function vivify(r: number, g: number, b: number): Rgb {
  const max = Math.max(r, g, b) || 1;
  const boost = Math.min(1.35, 255 / max); // lift toward full value, capped
  return [
    Math.round(Math.min(255, r * boost)),
    Math.round(Math.min(255, g * boost)),
    Math.round(Math.min(255, b * boost)),
  ];
}

// ── public controls ─────────────────────────────────────────────────────────

/** Make `colors` the standing ambient light (the screen's focused artwork). */
export function setAmbientArt(colors: Rgb[] | null): void {
  ambient = colors && colors.length ? colors : null;
  paint(ambient);
}

/** Temporarily override the wash — e.g. while a poster is hovered. */
export function focusArt(colors: Rgb[]): void {
  if (colors.length) paint(colors);
}

/** Release a transient focus, falling back to the standing ambient (or duo). */
export function releaseArt(): void {
  paint(ambient);
}

/** Drop the standing ambient entirely (e.g. leaving a screen) → back to the duo. */
export function clearAmbientArt(): void {
  ambient = null;
  paint(null);
}

/** Repaint the standing ambient — call after a theme change so alpha follows. */
export function refreshArtLight(): void {
  paint(ambient);
}
