#!/usr/bin/env node
/**
 * Check the art-light colour maths and the light-map sampler.
 *
 * These are the only part of this client that computes a colour rather than
 * passing one through, and nothing else can tell you they are wrong. A
 * transposed matrix coefficient still compiles, still renders, and still
 * produces colours — just not the artwork's. The screen looks *plausible*, which
 * is the failure mode this repository keeps running into: a green build over a
 * client that has quietly drifted from what it claims to do.
 *
 * Four things are checked, and the second is the one that earns the script.
 *
 *  1. **Round trip.** sRGB → OKLab → sRGB returns what went in. Necessary, and
 *     on its own almost worthless: the inverse of a WRONG matrix round-trips
 *     perfectly, so this passes just as happily on maths that is internally
 *     consistent and externally incorrect.
 *  2. **Known values.** The published OKLab coordinates of the sRGB primaries
 *     (Ottosson). This is what pins the transform to the real colour space
 *     rather than to itself, and it is what catches the swapped coefficient.
 *  3. **Constant lightness.** The accent is retoned by fixing L and letting the
 *     hue travel, and this asserts the property that buys: every hue lands at
 *     one perceived lightness. It also measures the HSL approach it replaced, so
 *     the reason for the change is recorded as a number rather than an opinion —
 *     `--color-text-on-accent` is a fixed token, so a lightness that swings with
 *     the artwork is a contrast bug and not a matter of taste.
 *  4. **The light map varies by position.** The whole point of the grid is that
 *     a surface over the cool part of an image is lit differently from one over
 *     the warm part. A sampler that returned the same colour everywhere would
 *     leave every screen looking exactly as it did with a global palette, and no
 *     other check here would notice.
 *
 * Runs after the build, like check-vocabulary, because it imports what the build
 * produced. It touches no DOM: the canvas path (cropping, decoding, the
 * monochrome fallback) needs a browser and is NOT covered here — see the note at
 * the end, which says so rather than letting a green tick imply otherwise.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const DIST = resolve("packages/sdui-react/dist/sdui/artlight.js");
if (!existsSync(DIST)) {
  console.error(
    `check-artlight: ${DIST} does not exist.\n\n` +
      `This script reads what the build produced, so it runs after it. If the\n` +
      `build was skipped, this check has nothing to measure — which is a failure\n` +
      `rather than a pass, because a check that cannot run looks identical to one\n` +
      `that found nothing wrong.\n`,
  );
  process.exit(1);
}

const { rgbToLab, labToRgb, sampleLab } = await import(pathToFileURL(DIST).href);

const failures = [];
const fail = (msg) => failures.push(msg);

// ── 1. round trip ───────────────────────────────────────────────────────────
{
  let worst = 0;
  let worstAt = null;
  for (let r = 0; r <= 255; r += 17) {
    for (let g = 0; g <= 255; g += 17) {
      for (let b = 0; b <= 255; b += 17) {
        const back = labToRgb(rgbToLab(r, g, b));
        const err = Math.max(Math.abs(back[0] - r), Math.abs(back[1] - g), Math.abs(back[2] - b));
        if (err > worst) {
          worst = err;
          worstAt = [r, g, b];
        }
      }
    }
  }
  if (worst > 1) {
    fail(`round trip: sRGB → OKLab → sRGB is off by ${worst} at rgb(${worstAt}); expected ≤ 1.`);
  }
}

// ── 2. known values ─────────────────────────────────────────────────────────
// Ottosson's published OKLab coordinates for the sRGB primaries. These pin the
// transform to the actual colour space; the round trip above cannot.
{
  const KNOWN = [
    { name: "white", rgb: [255, 255, 255], lab: [1.0, 0.0, 0.0] },
    { name: "black", rgb: [0, 0, 0], lab: [0.0, 0.0, 0.0] },
    { name: "red", rgb: [255, 0, 0], lab: [0.62796, 0.22486, 0.12585] },
    { name: "green", rgb: [0, 255, 0], lab: [0.86644, -0.23389, 0.1795] },
    { name: "blue", rgb: [0, 0, 255], lab: [0.45201, -0.03246, -0.31153] },
  ];
  for (const c of KNOWN) {
    const got = rgbToLab(...c.rgb);
    for (let i = 0; i < 3; i++) {
      if (Math.abs(got[i] - c.lab[i]) > 0.002) {
        fail(
          `known value: OKLab of ${c.name} is [${got.map((v) => v.toFixed(5))}], ` +
            `expected [${c.lab.join(", ")}] (component ${"Lab"[i]} off by ` +
            `${Math.abs(got[i] - c.lab[i]).toFixed(5)}).`,
        );
        break;
      }
    }
  }
}

// ── 3. constant lightness, and what it replaced ─────────────────────────────
{
  const TONE_L = 0.78;
  const TONE_C = 0.155;
  const hues = [];
  for (let deg = 0; deg < 360; deg += 15) hues.push((deg * Math.PI) / 180);

  // The new retone: fix OKLab L and C, let the hue travel.
  const oklabL = hues.map((h) => {
    const rgb = labToRgb([TONE_L, Math.cos(h) * TONE_C, Math.sin(h) * TONE_C]);
    return rgbToLab(...rgb)[0];
  });
  const spread = Math.max(...oklabL) - Math.min(...oklabL);
  // Not zero: a hue at this chroma can fall outside sRGB, and clipping it into
  // gamut moves its lightness a little. Bounded is the claim, not exact.
  if (spread > 0.06) {
    fail(
      `constant lightness: retoning across 24 hues at fixed OKLab L spread ` +
        `perceived lightness by ${spread.toFixed(4)}; expected ≤ 0.06.`,
    );
  }

  // The HSL retone this replaced, measured on the same hues. If this is ever not
  // dramatically worse, the argument for the change has evaporated and the
  // comment in artlight.ts is lying.
  const hslL = hues.map((h) => {
    const rgb = hslToRgb((h * 180) / Math.PI, 0.9, 0.7);
    return rgbToLab(...rgb)[0];
  });
  const hslSpread = Math.max(...hslL) - Math.min(...hslL);
  if (hslSpread < spread * 2) {
    fail(
      `constant lightness: the HSL retone spread lightness by ${hslSpread.toFixed(4)} ` +
        `against OKLab's ${spread.toFixed(4)} — the replacement is meant to be ` +
        `materially tighter, and this says it is not.`,
    );
  }
  process.stdout.write(
    `check-artlight: lightness spread across 24 hues — OKLab ${spread.toFixed(4)}, ` +
      `HSL ${hslSpread.toFixed(4)} (the bug this replaced).\n`,
  );
}

function hslToRgb(h, s, l) {
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
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

// ── 4. the light map varies by position ─────────────────────────────────────
{
  const W = 16;
  const H = 16;
  const warm = rgbToLab(230, 120, 60);
  const cool = rgbToLab(60, 120, 230);

  // Left half warm, right half cool — the arrangement the per-edge rim exists
  // for: one surface, two different colours around its perimeter.
  const cells = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const src = x < W / 2 ? warm : cool;
      const i = (y * W + x) * 3;
      cells[i] = src[0];
      cells[i + 1] = src[1];
      cells[i + 2] = src[2];
    }
  }
  const map = { w: W, h: H, cells, cx: 0.5, cy: 0.5 };

  const left = sampleLab(map, 0.1, 0.5, 1);
  const right = sampleLab(map, 0.9, 0.5, 1);
  const delta = Math.hypot(left[1] - right[1], left[2] - right[2]);
  if (delta < 0.05) {
    fail(
      `light map: sampling the warm and cool halves differed by only ${delta.toFixed(4)} ` +
        `in chroma; the grid is not varying by position, which is the entire ` +
        `reason it exists.`,
    );
  }

  // Out-of-range coordinates clamp rather than reading past the edge: a surface
  // overhanging the artwork is lit by the artwork's edge.
  const clamped = sampleLab(map, -3, 0.5, 1);
  const edge = sampleLab(map, 0, 0.5, 1);
  if (Math.hypot(clamped[0] - edge[0], clamped[1] - edge[1], clamped[2] - edge[2]) > 1e-6) {
    fail(`light map: u = -3 did not clamp to the leading edge.`);
  }

  // A uniform map returns its colour anywhere, including at the corners where
  // the neighbourhood is mostly clamped.
  const flat = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    flat[i * 3] = warm[0];
    flat[i * 3 + 1] = warm[1];
    flat[i * 3 + 2] = warm[2];
  }
  const uniform = { w: W, h: H, cells: flat, cx: 0.5, cy: 0.5 };
  for (const [u, v] of [
    [0, 0],
    [1, 1],
    [0.5, 0.5],
  ]) {
    const got = sampleLab(uniform, u, v, 2);
    if (Math.hypot(got[0] - warm[0], got[1] - warm[1], got[2] - warm[2]) > 1e-5) {
      fail(`light map: a uniform map returned a different colour at (${u}, ${v}).`);
    }
  }
}

if (failures.length > 0) {
  console.error(`check-artlight: ${failures.length} failure(s).\n`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error("");
  process.exit(1);
}

console.log(
  "check-artlight: OKLab round trip, sRGB primaries, constant-lightness retone " +
    "and light-map sampling all pass. Not covered: the canvas read itself " +
    "(cropping, decoding, the monochrome fallback), which needs a browser.",
);
