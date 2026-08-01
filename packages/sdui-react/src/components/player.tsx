/**
 * The Player primitive (ADR 0047).
 *
 * This is where the SDUI thesis takes its one stated limit, and the shape of the
 * component is that limit made concrete: the server decides *what* plays, *from
 * where*, *from what offset* and *what comes next*, and the client owns exactly
 * two things — the decoding pipeline and the transport controls. A scrub bar
 * cannot be pushed over a network at frame rate, and every client platform has
 * its own decoder, so the node names the mechanism and the client runs it.
 *
 * **A media framework, now that the origin serves HLS** (ADR 0070's stated
 * condition, met by ADR 0109). That record chose a bare <video> and said the
 * client adopts a framework when the Platform serves something a <video> cannot
 * play, "which today means HLS" — and a release that must go through ffmpeg is
 * now a playlist and segments rather than a progressive stream.
 *
 * Three things keep the adoption as narrow as the limit it sits under:
 *
 *   - **A relayed stream is untouched.** A release needing no work is still the
 *     upstream's own bytes at a plain `src`, byte-range seekable, no library in
 *     the path. That is most plays, and should become more of them as selection
 *     learns to rank on codec and dynamic range.
 *   - **Safari is untouched too.** It plays HLS natively, and asking the element
 *     is how everything else here decides what a browser can do — the same
 *     `canPlayType` the profile is built from, rather than a user-agent table.
 *   - **The library is imported only when it is needed.** A dynamic import keeps
 *     it out of the bundle every other playback loads, which matters precisely
 *     because transcoding is the last resort rather than the normal path.
 *
 * It adds no codec support: the browser still decodes. What it adds is the
 * ability to read a playlist and feed segments to Media Source Extensions.
 *
 * The src is always a Platform-origin ticket URL. The client never holds the
 * upstream location, which for a debrid link carries a credential (ADR 0045).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRuntime } from "../sdui/context.js";
import type { UINode } from "../sdui/types.js";

/**
 * How often a playing video reports where it has got to (ADR 0046).
 *
 * Fifteen seconds, and the number is a trade rather than a tuning: it bounds
 * what a hard crash can lose, and the Platform coalesces on top of it anyway, so
 * reporting faster mostly buys writes nobody reads. Every report that actually
 * matters — a pause, a completed seek, leaving — is sent on its own regardless.
 */
const PROGRESS_INTERVAL_MS = 15_000;

/**
 * What the Platform names a segmented stream as (ADR 0109). It travels on the
 * node so the pipeline is chosen before anything is fetched, rather than
 * discovered from a response the wrong reader has already started consuming.
 */
const HLS_MIME = "application/vnd.apple.mpegurl";

/**
 * SubtitleTrackProp is one authored subtitle script the server offered
 * (ADR 0115) — a URL under the same playback ticket, what it is, and whether it
 * is the one the viewer's preference chose.
 */
type SubtitleTrackProp = {
  src?: string;
  format?: string;
  language?: string;
  label?: string;
  default?: boolean;
};

/**
 * pickScriptTrack chooses which authored script to draw, or none.
 *
 * The server's choice, echoed — the track it marked default, and otherwise the
 * first it offered. **The client does not rank these.** Which subtitles a person
 * gets is a preference the Platform resolved against the release (ADR 0112), and
 * re-deciding it here would give two clients two different answers from one
 * preference.
 *
 * Only `ass`, because that is the only format libass draws and the only one
 * whose fidelity is the reason this path exists.
 */
function pickScriptTrack(
  tracks: SubtitleTrackProp[] | undefined,
): SubtitleTrackProp | undefined {
  const usable = (tracks ?? []).filter((t) => t.src && t.format === "ass");
  return usable.find((t) => t.default) ?? usable[0];
}

/**
 * Whether this browser reads a playlist without help.
 *
 * Safari does, on every Apple platform, and handing it hls.js there would
 * replace a native pipeline with a worse one. Asked of the element rather than
 * inferred from the user agent, which is the same rule the capability profile
 * follows and for the same reason: a table is a guess that ages.
 *
 * `canPlayType` answers "probably", "maybe" or "" — and "maybe" is a real yes
 * here. Safari returns it for HLS, because it cannot know without the manifest.
 */
function playsHLSNatively(el: HTMLVideoElement): boolean {
  return el.canPlayType(HLS_MIME) !== "";
}

export function Player({ node }: { node: UINode }) {
  const props = (node.props ?? {}) as {
    src?: string;
    title?: string;
    poster?: string;
    mimeType?: string;
    resumeAt?: number;
    nodeId?: string;
    partId?: string;
    subtitleTracks?: SubtitleTrackProp[];
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = props.src ?? "";
  const isHLS = props.mimeType === HLS_MIME;

  /*
   * Attaching hls.js, and only where all three conditions hold: the server said
   * this is a playlist, the browser cannot read one itself, and there is a src.
   *
   * The element's `src` attribute is left unset in that case — hls.js drives the
   * element through Media Source Extensions, and an element with both would
   * fetch the playlist as though it were media and fail to decode it.
   *
   * `failed` is React state rather than a ref because it has to reach the
   * render: a browser with neither native HLS nor MSE cannot play a segmented
   * release at all, and the honest answer is to say so rather than to leave a
   * black rectangle that never starts.
   */
  const [failed, setFailed] = useState("");
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src || !isHLS) return;
    if (playsHLSNatively(el)) {
      el.src = src;
      return;
    }

    let hls: { destroy(): void } | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setFailed("This browser cannot play a transcoded stream.");
          return;
        }
        const instance = new Hls({
          // The origin restarts ffmpeg for a segment nothing has reached, so a
          // request can legitimately take seconds to answer (ADR 0111). The
          // defaults assume a segment either exists or does not.
          manifestLoadingTimeOut: 30_000,
          fragLoadingTimeOut: 60_000,
        });
        hls = instance;
        instance.on(Hls.Events.ERROR, (_evt, data) => {
          // Only fatal errors reach the viewer. hls.js reports recoverable ones
          // constantly — a segment that arrived late, a gap it bridged — and
          // surfacing those would turn ordinary playback into a wall of errors.
          if (data.fatal) setFailed("This stream stopped: " + data.details);
        });
        instance.loadSource(src);
        instance.attachMedia(el);
      } catch (err) {
        setFailed("The player could not be loaded.");
        void err;
      }
    })();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, isHLS]);

  /*
   * Authored subtitle scripts, drawn by libass (ADR 0115).
   *
   * **This is a vocabulary capability, not a component.** The server decides
   * which track and sends the script; all that happens here is that a renderer
   * the browser cannot supply is loaded and pointed at the element. Nothing
   * about which subtitles, in what language, or whether they are on is decided
   * in this file.
   *
   * The reason it exists at all is that ASS is what anime releases use to place
   * signs and captions over the picture, and every other delivery loses that.
   * A WebVTT rendition keeps the words and drops the positions and colours; the
   * server can burn the track into the video instead, which keeps everything and
   * costs a full re-encode. This path keeps everything for free.
   *
   * **Every failure degrades to the HLS subtitle renditions**, which the server
   * declares in the playlist regardless. That is the whole reason this can be
   * attempted at all: a browser too old for the WASM, a blocked asset, a script
   * that will not parse — each of them leaves a player that still has subtitles,
   * so none of them is worth reporting as a playback error.
   */
  const scriptTrack = pickScriptTrack(props.subtitleTracks);
  const scriptSrc = scriptTrack?.src ?? "";
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !scriptSrc) return;

    let renderer: { destroy(): void } | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const { default: JASSUB } = await import("jassub");
        if (cancelled) return;
        // No asset URLs are passed, and that is deliberate rather than an
        // omission. jassub locates its own worker, its two WASM builds and its
        // fallback font with `new URL("./…", import.meta.url)` relative to its
        // own module — the one form a bundler rewrites into a built asset
        // address. Naming them here would mean guessing paths inside somebody
        // else's package and re-breaking on its next release; two earlier
        // attempts did exactly that.
        renderer = new JASSUB({ video: el, subUrl: scriptSrc });
      } catch (err) {
        // Silent on purpose. The renditions are already there.
        void err;
      }
    })();

    return () => {
      cancelled = true;
      renderer?.destroy();
    };
  }, [scriptSrc]);

  // Resume is applied once the element knows it can seek — which is now every
  // path but one. A relayed stream ranges against the upstream; a segmented one
  // has a complete VOD playlist, so a position nothing has produced yet is
  // reachable (ADR 0109). The exception is a source that reported no duration,
  // which the origin serves as an unseekable pipe: setting currentTime there is
  // a no-op rather than an error, which is the correct degradation.
  const resumeAt = props.resumeAt ?? 0;
  useEffect(() => {
    const el = videoRef.current;
    if (!el || resumeAt <= 0) return;
    const apply = () => {
      try {
        el.currentTime = resumeAt;
      } catch {
        /* not seekable — start from the beginning */
      }
    };
    el.addEventListener("loadedmetadata", apply, { once: true });
    return () => el.removeEventListener("loadedmetadata", apply);
  }, [resumeAt, src]);

  // Reporting position back (ADR 0046). The server owns what this means — the
  // completion threshold, the coalescing, whether it counts as finished — and
  // the client's whole part is saying where the element currently is.
  const { dispatch } = useRuntime();
  const nodeId = props.nodeId;
  const partId = props.partId;

  const report = useCallback(
    (final: boolean) => {
      const el = videoRef.current;
      if (!el || !nodeId) return;
      // A position of zero at the very start is not worth a row; it is what an
      // item looks like before anyone has watched any of it, and reporting it
      // would put every item anyone merely opened into continue-watching.
      if (!final && el.currentTime <= 0) return;
      void dispatch({
        kind: "invoke",
        mutation: "reportProgress",
        input: {
          nodeId,
          partId: partId ?? "",
          position: el.currentTime,
          // NaN and Infinity are both ordinary answers from a stream whose
          // length is not yet known — and a remuxed stream off a pipe never
          // knows it. Sending either would be sending nonsense the server has
          // to defend against, so it is sent as "not known" instead.
          duration: Number.isFinite(el.duration) ? el.duration : 0,
          final,
        },
      });
    },
    [dispatch, nodeId, partId],
  );

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !nodeId) return;

    const timer = window.setInterval(() => {
      if (!el.paused) report(false);
    }, PROGRESS_INTERVAL_MS);

    // The boundaries worth a report of their own. A pause is where someone
    // stops watching without closing anything; a settled seek is a deliberate
    // move to a place they want remembered; ending is the completion signal the
    // threshold needs to see.
    const onPause = () => report(true);
    const onSeeked = () => report(false);
    const onEnded = () => report(true);
    el.addEventListener("pause", onPause);
    el.addEventListener("seeked", onSeeked);
    el.addEventListener("ended", onEnded);

    // Leaving is the report most likely to be lost and the one that matters
    // most, because it is where the viewer actually stopped. `pagehide` rather
    // than `unload`, which is not fired reliably on mobile and blocks the
    // back/forward cache where it is.
    const onPageHide = () => report(true);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(timer);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("seeked", onSeeked);
      el.removeEventListener("ended", onEnded);
      window.removeEventListener("pagehide", onPageHide);
      // Closing the player is leaving it. This is the ordinary path — someone
      // presses the X — and without it the last position survives only as far
      // as the previous fifteen-second tick.
      report(true);
    };
  }, [nodeId, report, src]);

  if (!src) return null;

  // The surface around it — backdrop, title bar, dismissal — belongs to whoever
  // hosts the player region, not here. This renders the mechanism the server
  // named and nothing else, which is what keeps the limit in ADR 0047 narrow.
  //
  // `src` is set on the element for every path except a playlist this browser
  // cannot read, where hls.js owns the source instead. Setting both would have
  // the element fetch the playlist as media and fail to decode it.
  return (
    <>
      <video
        ref={videoRef}
        className="mos-player__video"
        src={isHLS ? undefined : src}
        poster={props.poster}
        controls
        autoPlay
        playsInline
        aria-label={props.title ?? "Player"}
      />
      {failed ? (
        <p className="mos-player__error" role="alert">
          {failed}
        </p>
      ) : null}
    </>
  );
}
