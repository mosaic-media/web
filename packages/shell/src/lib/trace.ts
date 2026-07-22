// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * W3C Trace Context, minted here (ADR 0054).
 *
 * A trace that starts at the server has already lost the interesting half. A
 * user's action begins with a click in this app, so this is where the trace id
 * is created; the Platform continues it rather than starting its own, and the
 * same id then appears on its log records, its event envelopes and — once the
 * store lands — its spans. One string joins a click to the SQL it caused,
 * across four repositories.
 *
 * This deliberately does NOT use the OpenTelemetry JS SDK. What is needed is a
 * random id, a version prefix and a string join; a media client should not
 * carry a general-purpose tracing runtime to produce one. If real client-side
 * spans are ever wanted, that decision can be taken then, and this stays
 * compatible because it emits the standard header.
 */

import type { Interceptor } from "@connectrpc/connect";

const TRACEPARENT_HEADER = "traceparent";

/** Hex-encode bytes, zero-padded — the traceparent field encoding. */
function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

/** One trace: the id that travels, and the header that carries it. */
export interface Trace {
  /** The 32-hex-character trace id — what a user quotes in a bug report. */
  traceId: string;
  /** The formatted `traceparent` header value. */
  header: string;
}

/**
 * Mint a new sampled trace. Flags are `01` (sampled): a self-hosted install
 * has no volume problem worth sampling away, and an unsampled trace is one
 * that cannot be looked up later — which is exactly the situation this exists
 * to prevent.
 */
export function newTrace(): Trace {
  const traceId = randomHex(16);
  return { traceId, header: `00-${traceId}-${randomHex(8)}-01` };
}

/**
 * The trace id of the most recent request, so a failure can be reported with
 * the one string that makes it reconstructible. Kept as a module-level value
 * rather than React state because it is diagnostic metadata, not something the
 * UI renders on change.
 */
let lastTraceId = "";

/** The trace id of the most recent request, or "" before any request. */
export function currentTraceId(): string {
  return lastTraceId;
}

/**
 * A Connect interceptor that stamps a fresh trace on every call — each unary
 * intent and each Subscribe stream. Per call rather than per session on
 * purpose: a session lives for hours and groups everything a user did all
 * evening, which is not a correlation.
 */
export const traceInterceptor: Interceptor = (next) => async (req) => {
  const trace = newTrace();
  req.header.set(TRACEPARENT_HEADER, trace.header);
  lastTraceId = trace.traceId;
  return await next(req);
};
