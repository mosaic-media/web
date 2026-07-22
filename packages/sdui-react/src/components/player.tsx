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

import { useEffect, useRef } from "react";
import type { UINode } from "../sdui/types";

export function Player({ node }: { node: UINode }) {
  const props = (node.props ?? {}) as {
    src?: string;
    title?: string;
    poster?: string;
    mimeType?: string;
    resumeAt?: number;
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
