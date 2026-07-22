// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Optical Parallax — the geometry half of the acrylic material (its colour half
 * is artlight.ts). Each acrylic surface is lit relative to the light source (the
 * "ambient" artwork), so a panel to the right of the hero and one below it catch
 * their edge highlight and caustic spill from different angles.
 *
 * For each `.msc-acrylic` element it writes four custom properties the material
 * CSS reads (components.css):
 *   --lx / --ly        unit vector from the surface toward the light source
 *   --edge-angle       gradient angle so the bright rim faces the light
 *   --acrylic-intensity 0..1 distance falloff (near the artwork → stronger)
 * Each falls back in CSS to the global light vector (tokens.css), so a surface
 * this pass hasn't measured yet is still correctly lit — never broken.
 *
 * V1 is STATIC per surface: it recomputes on load, on resize, on art-light
 * change, and when the DOM mutates (new screens/cards), but deliberately NOT on
 * scroll or pointer move. A surface measured then scrolled keeps its vector —
 * acceptable for v1 (see the migration notes). This is a WEB skin concern, kept
 * out of the portable primitive vocabulary; another client satisfies the same
 * custom-property contract its own way.
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The light-source point in viewport coordinates: the focused ("ambient")
 *  artwork if present, else the upper-left region the fixed wash comes from. */
function lightPoint(): { x: number; y: number } {
  const el = document.querySelector<HTMLElement>('[data-artlight="ambient"]');
  if (el) {
    const r = el.getBoundingClientRect();
    // Bias toward the artwork's upper-left, where the mockup's key light sits.
    if (r.width > 0 && r.height > 0) return { x: r.left + r.width * 0.35, y: r.top + r.height * 0.28 };
  }
  return { x: window.innerWidth * 0.3, y: 0 };
}

function relight(): void {
  const lp = lightPoint();
  const maxD = Math.hypot(window.innerWidth, window.innerHeight) || 1;
  document.querySelectorAll<HTMLElement>(".msc-acrylic").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return; // not laid out / hidden
    const dx = lp.x - (r.left + r.width / 2);
    const dy = lp.y - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    el.style.setProperty("--lx", ux.toFixed(3));
    el.style.setProperty("--ly", uy.toFixed(3));
    // Gradient angle whose 100% (bright) end points at the light: for
    // linear-gradient(θ), the end direction is (sin θ, -cos θ) in screen space.
    el.style.setProperty("--edge-angle", `${((Math.atan2(ux, -uy) * 180) / Math.PI).toFixed(1)}deg`);
    // Linear proximity falloff — a v1 stand-in for physical intensity.
    el.style.setProperty("--acrylic-intensity", clamp(1 - d / (maxD * 0.95), 0.4, 1).toFixed(3));
  });
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

/** Inject the SVG displacement filter that layer 1 (style.ts backdrop-filter)
 *  references to REFRACT — bend — the artwork behind each glass surface. A low
 *  base-frequency turbulence gives smooth, acrylic-like waves rather than noise. */
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
    '<feDisplacementMap in="SourceGraphic" in2="ns" scale="36" xChannelSelector="R" yChannelSelector="G"/>' +
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
  window.addEventListener("resize", schedule, { passive: true });
  // Live parallax: as content (and the artwork) scrolls, each surface re-lights
  // from the artwork's new position. capture:true catches the content region's
  // own scroll, not just the window. rAF-coalesced to one relight per frame.
  window.addEventListener("scroll", schedule, { passive: true, capture: true });
  // artlight.ts fires this when the standing artwork (the anchor) changes.
  window.addEventListener("mosaic:artlight", schedule);
  schedule();
}
