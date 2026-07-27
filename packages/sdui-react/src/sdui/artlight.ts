// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Art-light — the colour half of the "refraction" language: the artwork in
 * focus is the light source, and the UI takes its colour from it.
 *
 * Two things come out of one read of the image:
 *
 *   · the PALETTE — a few vivid, hue-distinct colours that drive the page's
 *     ambient wash (--art-glow-*) and retint the accent (--accent-rgb).
 *   · the LIGHT MAP — a coarse grid of the artwork's colour, in artwork-local
 *     coordinates, so a surface can be lit by the part of the image it is
 *     actually near rather than by an average of the whole thing.
 *
 * The light map is the reason a panel sitting ON the artwork can be lit
 * correctly. A single palette cannot express what the design asks for: a rim
 * that runs cool where the sky is behind it and warm where the sunset is. That
 * is not a tuning problem — one colour per surface has no way to say it. So the
 * grid is kept and acrylic.ts samples it per surface and per edge.
 *
 * All colour work happens in OKLab, and the reasons are concrete rather than
 * fashionable:
 *
 *   · Averaging a cluster in RGB pulls it toward grey. The previous pass
 *     weighted pixels by saturation and then averaged them in RGB, which threw
 *     that saturation away on the next line — and its correction step (scale
 *     all three channels by one factor) cannot restore it, because HSV
 *     saturation is invariant under uniform scaling. Averaging L, C and hue
 *     separately keeps the chroma the weighting selected for.
 *   · Hue must be averaged circularly. An arithmetic mean is wrong across the
 *     0°/360° wrap, which is exactly where red lives.
 *   · Fixing HSL's "lightness" does not fix lightness. Yellow at HSL l=0.7 is
 *     far brighter than blue at the same number, so an accent retoned in HSL
 *     swings in real brightness with the artwork — and since --color-text-on-
 *     accent is a fixed token, that is a contrast bug and not only an aesthetic
 *     one. OKLab's L is perceptual, so holding it constant holds it constant.
 *
 * This is a WEB runtime concern (canvas + CSS custom properties), deliberately
 * kept out of the portable primitive style vocabulary. Another client would
 * satisfy the same contract its own way, or omit it — the material underneath is
 * always valid on its own.
 */

/** A colour as sRGB bytes, which is what CSS custom properties carry. */
export type Rgb = [number, number, number];

/** A colour in OKLab: perceptual lightness plus two opponent axes. Cartesian,
 *  so a and b average linearly — unlike hue, which does not. */
export type Lab = [number, number, number];

/**
 * The artwork's colour as a coarse grid, in artwork-local coordinates.
 *
 * `cells` is row-major OKLab triples. `cx`/`cy` are the luminance-weighted
 * centroid in normalised [0,1] coordinates — where the light actually comes
 * from within the image, which is rarely its centre and is what a surface
 * should point at.
 */
export interface LightMap {
  w: number;
  h: number;
  cells: Float32Array;
  cx: number;
  cy: number;
}

/** One read of an image: what lights the page, and what lights each surface. */
export interface ArtSample {
  palette: Rgb[];
  map: LightMap;
}

/* The canvas is read at SAMPLE², and the light map is that reduced by whole
   blocks to MAP². Sampling well above the grid resolution matters: the browser's
   own downscale is a box filter, so drawing straight to 16×16 would average a
   small vivid element out of existence before the weighting loop ever saw it. */
const SAMPLE = 64;
const MAP = 16;
/* The palette-only read (a hovered tile). Coarser on purpose — see
   sampleArtPalette: this one runs inside a pointer interaction. */
const PALETTE_SAMPLE = 32;

/* Pixels too dark or too grey to carry a hue are not evidence of one. The floors
   are deliberately low — this excludes black bars and neutral backdrops, not
   moody artwork. */
const MIN_L = 0.12;
const MIN_C = 0.03;

/* Hue binning for peak finding, and the arc gathered around a peak. Fine bins
   locate the peak; the wide arc collects the cluster, so a hue straddling a bin
   boundary is not split between two bins and beaten by a weaker rival — the
   failure mode of the fixed 30° buckets this replaces. */
const HUE_BINS = 36;
const CLUSTER_ARC = 26;

/* A weighted mean still sits slightly inside the cluster it represents, so the
   representative is nudged back out. Bounded, and the conversion clamps to the
   gamut regardless. */
const CHROMA_GAIN = 1.12;
const CHROMA_MAX = 0.33;

/* Per-theme alpha for each ambient glow layer. The tokens default to
   transparent, so this is the only place the wash gets a value. */
const ALPHA_DARK = [0.24, 0.16, 0.11];
const ALPHA_LIGHT = [0.5, 0.42, 0.34];

/* What the sampled hue is re-toned to before it becomes the UI accent. Fixing
   OKLab L and C keeps buttons, nav and focus rings at one perceived brightness
   whatever the artwork looks like — only the HUE travels. */
const TONE_DARK = { L: 0.78, C: 0.155 };
const TONE_LIGHT = { L: 0.56, C: 0.15 };

const GLOW_VARS = ["--art-glow-1", "--art-glow-2", "--art-glow-3"] as const;
const ACCENT_VARS = ["--accent-rgb", "--accent-2-rgb"] as const;
// The raw sampled palette as bare `r, g, b` triplets — the acrylic material
// alphas these itself, and gives fill / edge / caustic DIFFERENT hues, so a
// surface reads as multi-coloured refraction rather than one dominant tint.
const ART_RGB_VARS = ["--art-1-rgb", "--art-2-rgb", "--art-3-rgb"] as const;

// ── colour maths ────────────────────────────────────────────────────────────

/** sRGB byte → linear, precomputed: this runs 4096×3 times per image. */
const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const lr = LINEAR[r]!;
  const lg = LINEAR[g]!;
  const lb = LINEAR[b]!;
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Linear light → sRGB byte, clamped into gamut. Negative components are a
 *  colour outside sRGB, and clipping them is the honest cheap answer. */
function encode(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
  return Math.round(Math.min(255, Math.max(0, v * 255)));
}

export function labToRgb(lab: Lab): Rgb {
  const l = (lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2]) ** 3;
  const m = (lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2]) ** 3;
  const s = (lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2]) ** 3;
  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Rebuild a Lab colour from a hue in radians and a chroma. */
function fromHue(L: number, hue: number, chroma: number): Lab {
  return [L, Math.cos(hue) * chroma, Math.sin(hue) * chroma];
}

/** The shorter way round between two hues, in degrees. */
function arc(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ── sampling ────────────────────────────────────────────────────────────────

/**
 * The region of the source image that is actually on screen.
 *
 * `object-fit: cover` crops, and sampling the whole natural image therefore
 * reads colours nobody can see — on a wide hero showing the middle band of a
 * tall poster, most of what was sampled was off screen. The computed style is
 * consulted rather than assumed because `contain` shows all of it.
 */
function sourceRect(img: HTMLImageElement): [number, number, number, number] {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const cw = img.clientWidth;
  const ch = img.clientHeight;
  if (!cw || !ch) return [0, 0, nw, nh];
  let fit = "cover";
  try {
    fit = getComputedStyle(img).objectFit || "cover";
  } catch {
    /* detached node — assume the default */
  }
  if (fit !== "cover") return [0, 0, nw, nh];
  const scale = Math.max(cw / nw, ch / nh);
  const vw = Math.min(nw, cw / scale);
  const vh = Math.min(nh, ch / scale);
  return [(nw - vw) / 2, (nh - vh) / 2, vw, vh];
}

/**
 * Read an image once, producing both the palette and the light map.
 *
 * Returns null when the canvas is unreadable (tainted by a cross-origin load) or
 * the image is not yet decoded — the caller keeps whatever light it already had.
 */
function read(img: HTMLImageElement, size: number): { lab: Float32Array; opaque: Uint8Array; n: number } | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  // No willReadFrequently: this is a single read, and that hint forces a
  // software-backed canvas which makes the drawImage slower, not faster.
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const [sx, sy, sw, sh] = sourceRect(img);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const n = size * size;
  const lab = new Float32Array(n * 3);
  const opaque = new Uint8Array(n);
  for (let i = 0, p = 0; p < n; i += 4, p++) {
    if (data[i + 3]! < 128) continue;
    opaque[p] = 1;
    const c = rgbToLab(data[i]!, data[i + 1]!, data[i + 2]!);
    lab[p * 3] = c[0];
    lab[p * 3 + 1] = c[1];
    lab[p * 3 + 2] = c[2];
  }
  return { lab, opaque, n };
}

export function sampleArtLight(img: HTMLImageElement, max = 3): ArtSample | null {
  if (!img.complete || img.naturalWidth === 0) return null;
  try {
    const r = read(img, SAMPLE);
    if (!r) return null;
    return {
      palette: extractPalette(r.lab, r.opaque, r.n, max),
      map: buildMap(r.lab, r.opaque, SAMPLE),
    };
  } catch {
    return null;
  }
}

/**
 * The palette alone, read at a quarter of the detail and with no light map.
 *
 * This is the `artLight="focus"` path — a hovered poster lends its colours to
 * the page wash and nothing else, so it has no use for the grid. That matters
 * because it runs **inside a pointer interaction**, on the main thread, the
 * first time each tile is hovered, and a library grid has a lot of tiles: the
 * full read is four times the pixels plus the grid reduction, all of it landing
 * in the frame the browser is timing for responsiveness.
 *
 * A palette does not need the resolution a light map does. It is a handful of
 * dominant colours over the whole image, and 1024 samples locate those as well
 * as 4096 do.
 */
export function sampleArtPalette(img: HTMLImageElement, max = 3): Rgb[] | null {
  if (!img.complete || img.naturalWidth === 0) return null;
  try {
    const r = read(img, PALETTE_SAMPLE);
    if (!r) return null;
    const palette = extractPalette(r.lab, r.opaque, r.n, max);
    return palette.length ? palette : null;
  } catch {
    return null;
  }
}

/** Reduce the read to the light-map grid, and locate the light within it. */
function buildMap(lab: Float32Array, opaque: Uint8Array, size: number): LightMap {
  const block = size / MAP;
  const cells = new Float32Array(MAP * MAP * 3);
  for (let gy = 0; gy < MAP; gy++) {
    for (let gx = 0; gx < MAP; gx++) {
      let L = 0;
      let A = 0;
      let B = 0;
      let count = 0;
      for (let y = gy * block; y < (gy + 1) * block; y++) {
        for (let x = gx * block; x < (gx + 1) * block; x++) {
          const p = y * size + x;
          if (!opaque[p]) continue;
          L += lab[p * 3]!;
          A += lab[p * 3 + 1]!;
          B += lab[p * 3 + 2]!;
          count++;
        }
      }
      const gi = (gy * MAP + gx) * 3;
      if (count > 0) {
        cells[gi] = L / count;
        cells[gi + 1] = A / count;
        cells[gi + 2] = B / count;
      }
    }
  }

  // The luminance-weighted centroid: where the light is, which for a backdrop is
  // usually nowhere near the middle. Squared so a bright region dominates rather
  // than merely contributing.
  let wx = 0;
  let wy = 0;
  let sum = 0;
  for (let gy = 0; gy < MAP; gy++) {
    for (let gx = 0; gx < MAP; gx++) {
      const L = cells[(gy * MAP + gx) * 3]!;
      const w = L * L;
      wx += ((gx + 0.5) / MAP) * w;
      wy += ((gy + 0.5) / MAP) * w;
      sum += w;
    }
  }
  return { w: MAP, h: MAP, cells, cx: sum > 0 ? wx / sum : 0.5, cy: sum > 0 ? wy / sum : 0.5 };
}

/**
 * The dominant, hue-distinct colours, by peak-and-suppress.
 *
 * Find the heaviest hue bin, gather every pixel within a wide arc of it as one
 * cluster, take its weighted representative, then remove those pixels and repeat.
 * Removing them is what makes the results distinct: without it the second answer
 * is the first one's neighbour.
 */
function extractPalette(lab: Float32Array, opaque: Uint8Array, n: number, max: number): Rgb[] {
  const chroma = new Float32Array(n);
  const hue = new Float32Array(n);
  const weight = new Float32Array(n);
  const bins = new Float64Array(HUE_BINS);
  const binWidth = 360 / HUE_BINS;

  for (let p = 0; p < n; p++) {
    if (!opaque[p]) continue;
    const L = lab[p * 3]!;
    const A = lab[p * 3 + 1]!;
    const B = lab[p * 3 + 2]!;
    const c = Math.hypot(A, B);
    if (L < MIN_L || c < MIN_C) continue;
    let h = (Math.atan2(B, A) * 180) / Math.PI;
    if (h < 0) h += 360;
    chroma[p] = c;
    hue[p] = h;
    // Favour chromatic, lit pixels — the perceptual analogue of s²v.
    weight[p] = c * c * L;
    bins[Math.min(HUE_BINS - 1, Math.floor(h / binWidth))] += weight[p]!;
  }

  const used = new Uint8Array(n);
  const out: Rgb[] = [];
  for (let k = 0; k < max; k++) {
    let peak = -1;
    let best = 0;
    for (let i = 0; i < HUE_BINS; i++) {
      if (bins[i]! > best) {
        best = bins[i]!;
        peak = i;
      }
    }
    if (peak < 0) break;
    const centre = (peak + 0.5) * binWidth;

    let sx = 0;
    let sy = 0;
    let sL = 0;
    let sC = 0;
    let sw = 0;
    for (let p = 0; p < n; p++) {
      if (used[p] || weight[p] === 0) continue;
      if (arc(hue[p]!, centre) > CLUSTER_ARC) continue;
      const w = weight[p]!;
      const rad = (hue[p]! * Math.PI) / 180;
      sx += Math.cos(rad) * w;
      sy += Math.sin(rad) * w;
      sL += lab[p * 3]! * w;
      sC += chroma[p]! * w;
      sw += w;
    }
    if (sw <= 0) {
      bins[peak] = 0;
      continue;
    }
    out.push(
      labToRgb(fromHue(sL / sw, Math.atan2(sy, sx), Math.min((sC / sw) * CHROMA_GAIN, CHROMA_MAX))),
    );

    for (let p = 0; p < n; p++) {
      if (used[p] || weight[p] === 0) continue;
      if (arc(hue[p]!, centre) > CLUSTER_ARC) continue;
      used[p] = 1;
      bins[Math.min(HUE_BINS - 1, Math.floor(hue[p]! / binWidth))] -= weight[p]!;
    }
    bins[peak] = 0;
  }

  if (out.length > 0) return out;

  // Monochrome artwork is still a light source. Returning nothing here sent the
  // page to bare unlit concrete for any black-and-white poster, which is a
  // worse answer than a dim neutral one.
  let sL = 0;
  let count = 0;
  for (let p = 0; p < n; p++) {
    if (!opaque[p]) continue;
    sL += lab[p * 3]!;
    count++;
  }
  if (count === 0) return [];
  return [labToRgb([Math.max(0.3, sL / count), 0, -0.02])];
}

/**
 * The light map's colour at a normalised artwork coordinate.
 *
 * `u`/`v` are clamped rather than rejected: a surface overhanging the artwork is
 * lit by the artwork's edge, which is the nearest true answer. How much light
 * reaches it is a question of distance, and the caller answers that separately
 * with intensity.
 */
export function sampleLab(map: LightMap, u: number, v: number, radius = 1): Lab {
  const gx = clamp(Math.floor(u * map.w), 0, map.w - 1);
  const gy = clamp(Math.floor(v * map.h), 0, map.h - 1);
  let L = 0;
  let A = 0;
  let B = 0;
  let count = 0;
  for (let y = gy - radius; y <= gy + radius; y++) {
    for (let x = gx - radius; x <= gx + radius; x++) {
      const cy = clamp(y, 0, map.h - 1);
      const cx = clamp(x, 0, map.w - 1);
      const gi = (cy * map.w + cx) * 3;
      L += map.cells[gi]!;
      A += map.cells[gi + 1]!;
      B += map.cells[gi + 2]!;
      count++;
    }
  }
  return [L / count, A / count, B / count];
}

// ── the standing light ──────────────────────────────────────────────────────

/** The standing ambient source (typically the hero art of the current screen). */
let ambient: Rgb[] | null = null;
let ambientMap: LightMap | null = null;

const root = () => (typeof document === "undefined" ? null : document.documentElement);

function isLight(): boolean {
  return root()?.dataset.theme === "light";
}

/** The light map currently lighting the page, for the per-surface pass. */
export function currentLightMap(): LightMap | null {
  return ambientMap;
}

/**
 * Write (or, with null, clear) the art-light vars:
 *  - --art-glow-1/2/3 : the palette at the ambient background alpha
 *  - --art-1/2/3-rgb  : the same colours raw, for the acrylic material
 *  - --accent-rgb / --accent-2-rgb : the two lead hues re-toned to a legible
 *    accent, which retints every accent-derived surface
 */
function paint(colors: Rgb[] | null): void {
  const el = root();
  if (!el) return;
  if (!colors || colors.length === 0) {
    [...GLOW_VARS, ...ACCENT_VARS, ...ART_RGB_VARS].forEach((v) => el.style.removeProperty(v));
    return;
  }
  const alpha = isLight() ? ALPHA_LIGHT : ALPHA_DARK;
  GLOW_VARS.forEach((v, i) => {
    const c = colors[Math.min(i, colors.length - 1)]!;
    el.style.setProperty(v, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha[i]})`);
  });
  ART_RGB_VARS.forEach((v, i) => {
    const c = colors[i];
    if (c) el.style.setProperty(v, `${c[0]}, ${c[1]}, ${c[2]}`);
    else el.style.removeProperty(v);
  });

  const tone = isLight() ? TONE_LIGHT : TONE_DARK;
  const first = rgbToLab(...colors[0]!);
  const h1 = Math.atan2(first[2], first[1]);
  let h2: number;
  if (colors[1]) {
    const second = rgbToLab(...colors[1]);
    h2 = Math.atan2(second[2], second[1]);
  } else {
    h2 = h1 + 0.61; // ~35°, so a single-colour palette still yields a duo
  }
  const a1 = labToRgb(fromHue(tone.L, h1, tone.C));
  const a2 = labToRgb(fromHue(tone.L, h2, tone.C));
  el.style.setProperty("--accent-rgb", a1.join(", "));
  el.style.setProperty("--accent-2-rgb", a2.join(", "));
}

/** Notify the per-surface pass that the standing light source changed. */
function signalRelight(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("mosaic:artlight"));
}

/** Make this sample the standing ambient light (the screen's focused artwork). */
export function setAmbientArt(colors: Rgb[] | null, map?: LightMap | null): void {
  ambient = colors && colors.length ? colors : null;
  if (map !== undefined) ambientMap = map;
  if (!ambient) ambientMap = null;
  paint(ambient);
  signalRelight();
}

/**
 * Temporarily override the wash — e.g. while a poster is hovered.
 *
 * The palette only: the standing artwork remains the light SOURCE, so surfaces
 * keep being lit from where the backdrop is. A hovered thumbnail lends its
 * colour to the page; it does not move the light.
 */
export function focusArt(colors: Rgb[]): void {
  if (colors.length) paint(colors);
}

/** Release a transient focus, falling back to the standing ambient. */
export function releaseArt(): void {
  paint(ambient);
}

/** Drop the standing ambient entirely (e.g. leaving a screen). */
export function clearAmbientArt(): void {
  ambient = null;
  ambientMap = null;
  paint(null);
  signalRelight();
}

/** Repaint the standing ambient — call after a theme change so the alphas and
 *  the accent tone follow the new theme.
 *
 *  It signals a relight as well, because the per-surface pass memoises what it
 *  last wrote: a theme change moves the palette underneath those values without
 *  moving any geometry, and without this the memo would consider every surface
 *  unchanged and leave the old theme's light on them. */
export function refreshArtLight(): void {
  paint(ambient);
  signalRelight();
}

/**
 * The palette alone, for a caller that does not need the light map.
 *
 * Kept because it is part of this package's published surface; the ambient path
 * uses sampleArtLight so one read serves both halves.
 */
export function sampleArtColors(img: HTMLImageElement, max = 3): Rgb[] | null {
  const sample = sampleArtLight(img, max);
  return sample && sample.palette.length ? sample.palette : null;
}
