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
 * **Why a bare <video> and not Shaka Player yet.** Shaka is the right renderer
 * the moment there is an adaptive stream — it handles DASH and HLS over Media
 * Source Extensions, and its support probe is the natural source for the
 * capability profile ADR 0048 wants a client to declare. It adds *no codec
 * support of its own*: the browser decodes either way. Both paths the Platform
 * serves today are progressive MP4 — a relayed upstream, or a stream-copy remux
 * out of ffmpeg — and for those Shaka does nothing a <video> element does not,
 * so adding it now would be a dependency that only forwards to the same element.
 * It goes in with HLS, or with the profile probe, whichever lands first.
 *
 * The src is always a Platform-origin ticket URL. The client never holds the
 * upstream location, which for a debrid link carries a credential (ADR 0045).
 */

import { useCallback, useEffect, useRef } from "react";
import { useRuntime } from "../sdui/context";
import type { UINode } from "../sdui/types";

/**
 * How often a playing video reports where it has got to (ADR 0046).
 *
 * Fifteen seconds, and the number is a trade rather than a tuning: it bounds
 * what a hard crash can lose, and the Platform coalesces on top of it anyway, so
 * reporting faster mostly buys writes nobody reads. Every report that actually
 * matters — a pause, a completed seek, leaving — is sent on its own regardless.
 */
const PROGRESS_INTERVAL_MS = 15_000;

export function Player({ node }: { node: UINode }) {
  const props = (node.props ?? {}) as {
    src?: string;
    title?: string;
    poster?: string;
    mimeType?: string;
    resumeAt?: number;
    nodeId?: string;
    partId?: string;
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = props.src ?? "";

  // Resume is applied once the element knows it can seek. A remuxed stream
  // cannot seek at all (fragmented MP4 off a pipe has no index, so the origin
  // answers Accept-Ranges: none) — setting currentTime there is a no-op rather
  // than an error, which is the correct degradation until segmenting lands.
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
  return (
    <video
      ref={videoRef}
      className="mos-player__video"
      src={src}
      poster={props.poster}
      controls
      autoPlay
      playsInline
      aria-label={props.title ?? "Player"}
    />
  );
}
