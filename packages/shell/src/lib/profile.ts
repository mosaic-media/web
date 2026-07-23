// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * What this browser can play, asked of the browser (ADR 0047, ADR 0070).
 *
 * The Platform used to hard-code a desktop Chrome's abilities at the point it
 * chose a release. That was honest for exactly one client, and every other
 * client the transport was built to serve would have been handed a lie — a
 * Safari that decodes E-AC3 told it cannot, and a phone told it can display 4K.
 *
 * So the client answers instead, and it does not answer from a table either.
 * `canPlayType` is the browser's own statement about its own decoders, which
 * accounts for the OS codec pack, the build flags and the platform in one call.
 * A hard-coded list here would be the same mistake moved one repository over.
 *
 * The declaration rides Attach, which is the one call made on every connect, and
 * the Platform reduces it to a capability class that keys its resolution cache.
 * The set below is therefore also a cache-fragmentation surface: every codec
 * added here can split one class into two. That is the correct trade when the
 * codec decides playability, and pure cost when it does not.
 */

/** The profile as the session contract carries it (mosaic.session.v1.ClientProfile). */
export interface ClientProfile {
  containers: string[];
  videoCodecs: string[];
  audioCodecs: string[];
  hdr: boolean;
  maxHeight: number;
}

/*
 * Probe strings, keyed by the name ffprobe reports on the server. The two must
 * agree: the Platform matches these against a probe of the actual bytes
 * (ADR 0050), so a name mismatch reads as "the client cannot play this" and
 * silently forces a re-encode of something that would have played.
 */
const VIDEO_PROBES: ReadonlyArray<readonly [string, string]> = [
  ["h264", 'video/mp4; codecs="avc1.42E01E"'],
  ["hevc", 'video/mp4; codecs="hvc1.1.6.L93.B0"'],
  ["vp9", 'video/mp4; codecs="vp09.00.10.08"'],
  ["av1", 'video/mp4; codecs="av01.0.05M.08"'],
  ["vp8", 'video/webm; codecs="vp8"'],
];

/*
 * Audio is the half that actually decides whether a release has sound, and the
 * half a hard-coded profile gets most wrong. Chrome decodes none of AC-3/E-AC-3;
 * Safari on macOS decodes both. Asking makes that difference free — the same
 * item resolves to a direct play on one and an audio encode on the other,
 * without either being told about the other's limits.
 */
const AUDIO_PROBES: ReadonlyArray<readonly [string, string]> = [
  ["aac", 'audio/mp4; codecs="mp4a.40.2"'],
  ["mp3", "audio/mpeg"],
  ["opus", 'audio/ogg; codecs="opus"'],
  ["vorbis", 'audio/ogg; codecs="vorbis"'],
  ["flac", "audio/flac"],
  ["ac3", 'audio/mp4; codecs="ac-3"'],
  ["eac3", 'audio/mp4; codecs="ec-3"'],
];

/**
 * clientProfile asks this browser what it can decode and display.
 *
 * It is derived per connect rather than cached in module scope: a page can move
 * between displays, and a reconnect is the only moment the answer can change
 * hands anyway.
 */
export function clientProfile(): ClientProfile {
  const probe = probeFn();
  return {
    /*
     * Deliberately empty. A plain <video src> uses the browser's own demuxer,
     * which handles Matroska perfectly well — a live test proved it — so
     * declaring a container set here would reject most real releases in favour
     * of re-muxing them for no reason. It becomes a real answer when the player
     * moves to MSE, which takes only fMP4 and WebM.
     */
    containers: [],
    videoCodecs: VIDEO_PROBES.filter(([, mime]) => probe(mime)).map(([name]) => name),
    audioCodecs: AUDIO_PROBES.filter(([, mime]) => probe(mime)).map(([name]) => name),
    hdr: prefersHDR(),
    maxHeight: displayHeight(),
  };
}

/**
 * probeFn returns a predicate over a MIME type, or one that answers "no" when
 * there is no media element to ask — a server-side render or a test environment.
 *
 * Answering "no" there is the safe direction: it produces a client that claims
 * nothing, and the Platform treats a claim of nothing as a real declaration and
 * plays it safe. Claiming everything would silently pick unplayable releases.
 */
function probeFn(): (mime: string) => boolean {
  if (typeof document === "undefined") return () => false;
  const el = document.createElement("video");
  if (typeof el.canPlayType !== "function") return () => false;
  // canPlayType answers "", "maybe" or "probably". Every string above carries an
  // explicit codec parameter, which is what earns a "probably" from a browser
  // that is sure — so "maybe" here means the browser is hedging about a codec it
  // was told precisely, and the honest reading is that it might not decode it.
  return (mime) => el.canPlayType(mime) === "probably";
}

/**
 * prefersHDR reports whether this display can actually render high dynamic
 * range.
 *
 * The failure it prevents is visible rather than subtle. An HDR10 or Dolby
 * Vision stream handed to an SDR pipeline decodes fine and comes out purple and
 * green, which reads as a corrupt file rather than an unsupported format — so
 * "can decode HEVC" is not the same question and cannot stand in for it.
 */
function prefersHDR(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(dynamic-range: high)").matches;
  } catch {
    // An older browser does not know the query. It is also not an HDR browser.
    return false;
  }
}

/**
 * displayHeight is the tallest picture this screen can actually show, in device
 * pixels.
 *
 * The screen rather than the window, because a window is resized constantly and
 * a viewer who maximises mid-film should not have chosen a worse release by
 * being small when they pressed play. Device pixels rather than CSS pixels,
 * because a 3× phone reporting 812 would be told it wants 480p.
 *
 * The *shorter* side, because that is the picture's height when video is
 * watched: a 1920×1080 monitor shows 1080 lines, and a phone shows its narrow
 * dimension once it is turned sideways. Taking the longer one would tell a 1080p
 * display it wanted 1920 lines and hand it a 1440p release to downscale.
 */
function displayHeight(): number {
  if (typeof window === "undefined" || !window.screen) return 0;
  const dpr = window.devicePixelRatio || 1;
  const w = window.screen.width || 0;
  const h = window.screen.height || 0;
  // With one dimension missing, the other is a better answer than zero.
  const side = w > 0 && h > 0 ? Math.min(w, h) : Math.max(w, h);
  const px = Math.round(side * dpr);
  // A nonsensical answer is worse than none: 0 means "uncapped", which is what
  // the Platform assumed before anyone declared anything.
  return px > 0 ? px : 0;
}
