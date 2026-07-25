// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Lazy lists (ADR 0093).
 *
 * A node saying `hasMore` is a page of something longer, and `loadMore` is what
 * fetches the next one. Both come from the server: a page that happens to be
 * full is not evidence there is another, and a client inferring one from the
 * count asks for a page that does not exist.
 *
 * The trigger is the list's end coming into view, with a margin so the request
 * is in flight before the viewer arrives at the bottom. It reuses the lifecycle
 * triggers' observer machinery, and the same correction with it: the wrapper is
 * display:contents and generates no box, so what is observed is the child.
 */

import { useEffect, useRef } from "react";
import type { Action } from "./types.js";

/**
 * How far ahead of the end a page is requested.
 *
 * Enough that a request is usually in flight before the viewer reaches the
 * bottom, and not so much that scrolling one screen loads three pages nobody
 * looks at. Stated rather than tuned per list, so two lists behave the same.
 */
export const PREFETCH_MARGIN_PX = 600;

/**
 * Ask for the next page as this list's end approaches.
 *
 * Once per page, not once per intersection: the guard is the number of children
 * the list had when the request went out. Until that changes the page has not
 * arrived, and asking again would repeat the same request at whatever rate the
 * observer fires — which is how a lazy list becomes a request loop.
 */
export function useLazyList(
  wrapper: { current: HTMLElement | null },
  hasMore: boolean,
  loadMore: Action | undefined,
  childCount: number,
  emit: (action?: Action) => void,
): void {
  const emitRef = useRef(emit);
  const actionRef = useRef(loadMore);
  emitRef.current = emit;
  actionRef.current = loadMore;

  // The child count when the last request was sent; -1 means none is in flight.
  const requestedAt = useRef(-1);

  useEffect(() => {
    if (requestedAt.current !== -1 && childCount !== requestedAt.current) requestedAt.current = -1;
  }, [childCount]);

  useEffect(() => {
    if (!hasMore || !loadMore) return;
    const el = (wrapper.current?.firstElementChild as HTMLElement | null) ?? wrapper.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (requestedAt.current !== -1) continue;
          requestedAt.current = childCount;
          emitRef.current(actionRef.current);
        }
      },
      { rootMargin: `0px 0px ${PREFETCH_MARGIN_PX}px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wrapper, hasMore, loadMore, childCount]);
}
