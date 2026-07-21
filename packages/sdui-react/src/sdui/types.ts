// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The SDUI contract.
 *
 * The Platform sends a tree of UINodes. The Shell walks the tree and renders
 * each node with the component registered for its `type`. Behaviour is carried
 * in `Action` envelopes, so a button or card knows what to do without the
 * client shipping bespoke logic.
 *
 * Two deliberate choices mirror the Platform's own architecture:
 *   1. `type` is an OPEN vocabulary (ADR 0015 in mosaic-architecture). A module
 *      can introduce a new component type; an old client renders a graceful
 *      Unknown placeholder rather than crashing.
 *   2. Actions are DATA, not code. The server never sends executable behaviour,
 *      only a declarative envelope the Shell interprets.
 */

/** A single node in a server-driven UI tree. */
export interface UINode {
  /** Component discriminator, e.g. "PosterCard". Open vocabulary. */
  type: string;
  /** Stable id — useful as a React key and for targeted updates. */
  id?: string;
  /** Component-specific data. Each component documents the props it reads. */
  props?: Record<string, unknown>;
  /** Ordered child nodes (the common case: containers). */
  children?: UINode[];
  /**
   * Named slots for components that take structured regions rather than a
   * single ordered list, e.g. a HeroBanner's `background` vs `actions`.
   */
  slots?: Record<string, UINode | UINode[]>;
}

/**
 * A serialisable behaviour envelope. The Shell interprets each kind; the server
 * only ever emits data. Add kinds as the surface grows — keep them declarative.
 */
export type Action =
  /** Push another server-defined screen by name (+ params for the query). */
  | { kind: "navigate"; screen: string; params?: Record<string, unknown> }
  /** Go back in the Shell's navigation stack. */
  | { kind: "back" }
  /** Open an external URL in a new tab (validated by the Shell). */
  | { kind: "openUrl"; url: string }
  /**
   * Invoke a Platform GraphQL mutation by name with an input map, e.g.
   * "importContent". The Shell resolves the caller/session; the server
   * re-authorises (ADR 0017).
   */
  | { kind: "invoke"; mutation: string; input?: Record<string, unknown> }
  /** Run a Platform query and (optionally) refresh a region with the result. */
  | { kind: "query"; query: string; variables?: Record<string, unknown>; into?: string }
  /** Present a node as an overlay (modal / sheet / drawer). */
  | { kind: "openOverlay"; surface?: "modal" | "sheet" | "drawer"; node: UINode }
  /** Dismiss the topmost overlay. */
  | { kind: "closeOverlay" }
  /** Ask the Shell to resolve & play a content Part (future playback module). */
  | { kind: "playPart"; partId: string; nodeId?: string }
  /** Show a transient toast. */
  | { kind: "toast"; message: string; tone?: Tone }
  /** Run several actions in order. */
  | { kind: "sequence"; actions: Action[] };

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

/** Result of dispatching an action, so callers can await network kinds. */
export interface ActionResult {
  ok: boolean;
  data?: unknown;
  error?: { category: PlatformErrorCategory; message: string };
}

/**
 * The Platform's fixed error categories (from CLAUDE.md / the contracts). The
 * Shell maps every failure into one of these so feedback UI is uniform.
 */
export type PlatformErrorCategory =
  | "InvalidArgument"
  | "Unauthenticated"
  | "PermissionDenied"
  | "NotFound"
  | "Conflict"
  | "Unavailable"
  | "Internal";
