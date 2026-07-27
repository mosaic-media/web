// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Optical Parallax — the geometry half of the acrylic material (its colour half
 * is artlight.ts). Each acrylic surface is lit relative to the artwork, so a
 * panel beside the hero and one below it catch their edge highlight and caustic
 * spill from different angles, in different colours.
 *
 * The material is ILLUMINATION, not transmission. A surface over the artwork is
 * a dark slab that the artwork rakes with light — you see the art beside it, not
 * through it. That is why the colour a surface takes is sampled from the light
 * map rather than left to a backdrop blur: a heavy blur would show the artwork
 * through the panel, which is a different material.
 *
 * For each `.msc-acrylic` element this writes:
 *   --lx / --ly          unit vector from the surface toward the light
 *   --edge-angle         gradient angle so the bright rim faces the light
 *   --acrylic-intensity  0..1 distance falloff (near the artwork → stronger)
 *   --acrylic-fill       the colour BEHIND the surface (interior bloom)
 *   --acrylic-caustic    the colour just beyond its shadow-side edge
 *   --edge-t/r/b/l       the rim colour at each edge, brightness baked in
 *   --edge-lit           the brightest of the four, for the outer bloom
 * Each falls back in CSS to the global light vector and the palette, so a
 * surface this pass has not measured yet is still correctly lit — never broken.
 *
 * The per-edge colours are the point. A rim that runs cool where the sky sits
 * behind it and warm where the sunset does cannot be said with one colour per
 * surface, however well that colour is chosen — so the design's rim is
 * unreachable from a global palette by construction, not by tuning.
 *
 * It also publishes --art-origin-x/y on :root: where the light is in the
 * viewport, so the page's ambient wash can sit under the artwork rather than at
 * a hardcoded percentage that has no relationship to it.
 */

import {
  currentLightMap,
  labToRgb,
  rgbToLab,
  sampleLab,
  type Lab,
  type LightMap,
  type Rgb,
} from "./artlight.js";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* Distance falloff, floored, and the floors are the whole difference between the
   two light sources. Artwork light comes from one place ON the page, so a panel
   far from it should fall away to nearly nothing — the design's own intensity
   scale runs from a vivid near surface to an essentially unlit far one, which a
   floor of 0.4 could never reach. The brand light is a studio light on the whole
   slab, so glass lit by it stays lit. */
const FALLOFF_ART = { lo: 0.06, hi: 1 };
const FALLOFF_BRAND = { lo: 0.82, hi: 1 };

/* Below this distance the direction toward the light is blended into the global
   studio vector. A panel sitting ON the artwork has no meaningful direction to a
   point inside itself: the unit vector flips on a one-pixel scroll, which read as
   the highlight swinging around the panel. A surface inside a large light source
   is lit from everywhere, and the studio vector is the honest answer. */
const STEADY_D = 96;

/* How far beyond an edge to look for the light reaching it, as a fraction of the
   artwork's short side. */
const RIM_REACH = 0.06;

/* The far edge keeps this fraction of its sampled lightness — dim, not black,
   because an unlit rim reads as a missing border rather than as a shadowed one.
   Above HOT the rim runs toward white, which is what makes it read as a
   specular highlight rather than a coloured line. */
const EDGE_FLOOR = 0.32;
const HOT = 0.62;

const NEUTRAL: Rgb = [136, 148, 178];

/**
 * What each surface was last given, so an unchanged surface costs nothing.
 *
 * A WeakMap rather than an expando or a data attribute: it holds no element
 * alive, so a surface removed from the tree is collected with its entry, and
 * nothing has to notice the removal.
 */
const memo = new WeakMap<HTMLElement, string>();

/**
 * Bumped whenever something OUTSIDE a surface's geometry changes the light —
 * new artwork, a theme repaint, a resize. It rides the signature, so one
 * increment invalidates every memo at once without walking anything.
 */
let epoch = 0;

/** The last origin written to :root, memoised for the same reason. */
let lastOrigin = "";

/** The global studio light from the tokens, as a unit vector. Cached: reading it
 *  is a style resolve, and it changes only with the theme. */
let studio: { x: number; y: number } | null = null;
function studioLight(): { x: number; y: number } {
  if (studio) return studio;
  let x = -0.4;
  let y = -0.9;
  try {
    const cs = getComputedStyle(document.documentElement);
    x = parseFloat(cs.getPropertyValue("--light-x")) || x;
    y = parseFloat(cs.getPropertyValue("--light-y")) || y;
  } catch {
    /* keep the defaults */
  }
  const d = Math.hypot(x, y) || 1;
  studio = { x: x / d, y: y / d };
  return studio;
}

/** The palette's edge colour, for surfaces with no artwork to sample. Read once
 *  per pass rather than per surface. */
function paletteEdge(): Lab {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--acrylic-edge");
    const m = raw.match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/);
    if (m) {
      const byte = (s: string | undefined) => clamp(Math.round(Number(s)), 0, 255);
      return rgbToLab(byte(m[1]), byte(m[2]), byte(m[3]));
    }
  } catch {
    /* fall through to the neutral */
  }
  return rgbToLab(...NEUTRAL);
}

const EDGES = [
  { key: "--edge-t", nx: 0, ny: -1 },
  { key: "--edge-r", nx: 1, ny: 0 },
  { key: "--edge-b", nx: 0, ny: 1 },
  { key: "--edge-l", nx: -1, ny: 0 },
] as const;

/**
 * One edge's rim colour: the light reaching it, dimmed by how far it faces away
 * from the source and run toward white where it faces it squarely.
 */
function rimColour(base: Lab, facing: number): Rgb {
  const f = (clamp(facing, -1, 1) + 1) / 2;
  const L = base[0] * (EDGE_FLOOR + (1 - EDGE_FLOOR) * f);
  const hot = f <= HOT ? 0 : (f - HOT) / (1 - HOT);
  // Toward white: lift lightness and drop chroma together, which is what a
  // specular highlight does to a pigment.
  const lifted = L + hot * (1 - L) * 0.72;
  const chroma = 1 - hot * 0.55;
  return labToRgb([clamp(lifted, 0, 1), base[1] * chroma, base[2] * chroma]);
}

/** The shortest gap between two rectangles; zero when they overlap. */
function rectGap(a: DOMRect, b: DOMRect): number {
  const dx = Math.max(b.left - a.right, a.left - b.right, 0);
  const dy = Math.max(b.top - a.bottom, a.top - b.bottom, 0);
  return Math.hypot(dx, dy);
}

function relight(): void {
  const el0 = document.documentElement;
  const map: LightMap | null = currentLightMap();
  const artEl = document.querySelector<HTMLElement>('[data-artlight="ambient"]');
  const art = artEl?.getBoundingClientRect();
  const lit = !!(map && art && art.width > 0 && art.height > 0);

  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  const diag = Math.hypot(vw, vh) || 1;
  const G = studioLight();

  // Where the light is, in viewport percentages, so the page wash can follow it.
  // Memoised like everything else: this one feeds three page-sized radial
  // gradients on the body, which is the most expensive single thing to repaint
  // on the screen.
  // Quantised to whole percent, which is what makes the memo above bite during a
  // scroll. The artwork moves continuously, so a tenth-of-a-percent origin
  // changes on every single frame and repaints the wash every time — and the
  // wash is three viewport-sized radial gradients, the largest paint on screen.
  // One percent is ~10px of travel under a 1100px gradient with a soft falloff:
  // there is no frame in which the difference is visible.
  const origin =
    lit && map && art
      ? `${Math.round(((art.left + map.cx * art.width) / vw) * 100)}%|` +
        `${Math.round(((art.top + map.cy * art.height) / vh) * 100)}%`
      : "";
  if (origin !== lastOrigin) {
    lastOrigin = origin;
    if (origin) {
      const [ox, oy] = origin.split("|");
      el0.style.setProperty("--art-origin-x", ox!);
      el0.style.setProperty("--art-origin-y", oy!);
    } else {
      el0.style.removeProperty("--art-origin-x");
      el0.style.removeProperty("--art-origin-y");
    }
  }

  const falloff = lit ? FALLOFF_ART : FALLOFF_BRAND;
  let fallbackEdge: Lab | null = null;
  const reach = lit && art ? RIM_REACH * Math.min(art.width, art.height) : 0;

  // PASS 1 — read every rectangle before writing anything.
  //
  // Interleaving reads and writes is what made this pass cost what it did: an
  // inline style write marks that element's style dirty, so the NEXT
  // getBoundingClientRect has to flush it, and the loop pays a style recalc per
  // surface instead of one for the batch.
  const surfaces: Array<{ el: HTMLElement; r: DOMRect }> = [];
  document.querySelectorAll<HTMLElement>(".msc-acrylic").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return; // not laid out / hidden
    // A surface nowhere near the viewport cannot be seen; skip the maths rather
    // than writing custom properties nothing will paint.
    if (r.bottom < -240 || r.top > vh + 240 || r.right < -240 || r.left > vw + 240) return;
    surfaces.push({ el, r });
  });

  // PASS 2 — cheap geometry, the memo gate, then colour only for what moved.
  for (const { el, r } of surfaces) {
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    let ux = G.x;
    let uy = G.y;
    let intensity: number;

    if (lit && map && art) {
      const lx = art.left + map.cx * art.width;
      const ly = art.top + map.cy * art.height;
      const dx = lx - cx;
      const dy = ly - cy;
      const d = Math.hypot(dx, dy);
      if (d > 0.001) {
        const t = clamp(d / STEADY_D, 0, 1);
        ux = G.x * (1 - t) + (dx / d) * t;
        uy = G.y * (1 - t) + (dy / d) * t;
        const n = Math.hypot(ux, uy) || 1;
        ux /= n;
        uy /= n;
      }
      // Distance to the artwork RECT, not to a point: a panel over the artwork
      // is fully lit wherever on it it happens to sit, which is what made the
      // point-distance version brightest exactly where it was least accurate.
      intensity = clamp(1 - rectGap(r, art) / (diag * 0.5), falloff.lo, falloff.hi);
    } else {
      const d = Math.hypot(vw * 0.3 - cx, 0 - cy);
      intensity = clamp(1 - d / (diag * 0.95), falloff.lo, falloff.hi);
    }

    // The memo gate, and the reason this pass can run on every scroll frame.
    //
    // A surface and the artwork lighting it usually scroll TOGETHER, so their
    // relative geometry — and therefore every value below — is unchanged. The
    // signature is expressed relative to the artwork precisely so that a scroll
    // which moves both by the same amount produces the same string.
    //
    // The gate has to sit HERE, before the sampling and the colour conversions,
    // not merely in front of the writes: computing six samples and six OKLab
    // conversions only to discard them would keep most of the cost. And skipping
    // the writes matters more than skipping the maths, because these properties
    // feed gradients and a blurred multi-layer shadow, so writing an IDENTICAL
    // value still invalidates paint.
    const sig = lit && art
      ? `1|${epoch}|${Math.round(r.left - art.left)}|${Math.round(r.top - art.top)}|` +
        `${Math.round(r.width)}|${Math.round(r.height)}|${ux.toFixed(3)}|${uy.toFixed(3)}|${intensity.toFixed(3)}`
      : `0|${epoch}|${ux.toFixed(3)}|${uy.toFixed(3)}|${intensity.toFixed(3)}`;
    if (memo.get(el) === sig) continue;
    memo.set(el, sig);

    el.style.setProperty("--lx", ux.toFixed(3));
    el.style.setProperty("--ly", uy.toFixed(3));
    el.style.setProperty("--acrylic-intensity", intensity.toFixed(3));

    if (!lit && !fallbackEdge) fallbackEdge = paletteEdge();

    let hottest = -2;
    let hotColour: Rgb = NEUTRAL;
    for (const e of EDGES) {
      let base: Lab;
      if (lit && map && art) {
        const px = cx + e.nx * (r.width / 2 + reach);
        const py = cy + e.ny * (r.height / 2 + reach);
        base = sampleLab(map, (px - art.left) / art.width, (py - art.top) / art.height, 1);
      } else {
        base = fallbackEdge!;
      }
      const facing = e.nx * ux + e.ny * uy;
      const colour = rimColour(base, facing);
      el.style.setProperty(e.key, colour.join(", "));
      if (facing > hottest) {
        hottest = facing;
        hotColour = colour;
      }
    }
    el.style.setProperty("--edge-lit", hotColour.join(", "));

    if (lit && map && art) {
      // The interior bloom takes the colour behind the surface's own middle.
      const fill = sampleLab(map, (cx - art.left) / art.width, (cy - art.top) / art.height, 2);
      el.style.setProperty("--acrylic-fill", labToRgb(fill).join(", "));
      // The caustic pools just beyond the shadow-side edge — away from the light.
      const gx = cx - ux * (r.width / 2 + reach);
      const gy = cy - uy * (r.height / 2 + reach);
      const spill = sampleLab(map, (gx - art.left) / art.width, (gy - art.top) / art.height, 1);
      el.style.setProperty("--acrylic-caustic", labToRgb(spill).join(", "));
    } else {
      // Back to the palette chain in skin.css.
      el.style.removeProperty("--acrylic-fill");
      el.style.removeProperty("--acrylic-caustic");
    }
  }
}

let scheduled = false;
function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    relight();
  });
}

/** Inject the SVG displacement filter that the glass backdrop-filter references.
 *
 * The displacement is deliberately slight. The material is a dark slab lit by
 * the artwork rather than a window onto it, so a large ripple was buying a
 * distortion of something barely visible through the surface — and it was the
 * one part of the material Safari could not run at all, which left the two
 * browsers looking materially different. */
function injectFilter(): void {
  if (document.getElementById("msc-acrylic-svg")) return;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.id = "msc-acrylic-svg";
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
  svg.innerHTML =
    '<filter id="msc-refract" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="11" result="n"/>' +
    '<feGaussianBlur in="n" stdDeviation="0.8" result="ns"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="ns" scale="14" xChannelSelector="R" yChannelSelector="G"/>' +
    "</filter>";
  document.body.appendChild(svg);
}

let started = false;
/** Start the parallax pass. Idempotent; call once at boot (installComponents). */
export function initAcrylic(): void {
  if (started || typeof document === "undefined") return;
  started = true;
  injectFilter();
  // New screens/cards mutate the tree; a rAF-coalesced relight covers them.
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener(
    "resize",
    () => {
      epoch++;
      schedule();
    },
    { passive: true },
  );
  // Live parallax: as content (and the artwork) scrolls, each surface re-lights
  // from the artwork's new position. capture:true catches the content region's
  // own scroll, not just the window. rAF-coalesced to one relight per frame.
  window.addEventListener("scroll", schedule, { passive: true, capture: true });
  // artlight.ts fires this when the standing artwork (the anchor) changes — and
  // a theme change repaints through the same path, so the studio vector is
  // dropped here rather than cached forever.
  window.addEventListener("mosaic:artlight", () => {
    studio = null;
    // New artwork (or a theme repaint) changes the light without moving a single
    // surface, so the memo has to be invalidated explicitly or every surface
    // would be judged unchanged and keep the previous screen's light.
    epoch++;
    schedule();
  });
  schedule();
}
