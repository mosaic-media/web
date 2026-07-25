// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The recursive renderer. Give it a UINode (or a list) and it walks the tree,
 * resolving each node's `type` through the registry. Components pull their own
 * children by calling <Slot> / <Children> so container components control
 * layout, not the renderer.
 */

import { Fragment, useCallback, useContext, useRef } from "react";
import type { UINode } from "./types";
import { resolve, reportUnknownType } from "./registry";
import { resolveProps, getPath, type BindingScope } from "./binding";
import { ShellRuntimeContext } from "./context";
import { ScopeContext, lookup } from "./scope";
import { useLifecycle } from "./lifecycle";
import type { Action } from "./types";
import { Unknown } from "../components/feedback/Unknown";

export function RenderNode({ node }: { node: UINode }) {
  // Bindings resolve here, at render, against the params the current screen was
  // navigated with. Here rather than once when the tree arrives, because a
  // re-render with different params must re-resolve — and because a tree stored
  // half-resolved is a tree nobody can reason about later, when state scopes add
  // more places to look.
  //
  // resolveProps returns the identical object when nothing was bound, so a tree
  // with no bindings — every tree today — costs one shallow scan per node and
  // allocates nothing.
  const runtime = useContext(ShellRuntimeContext);
  const scope = useContext(ScopeContext);
  // Nearest-first: a State scope that declares the name wins over an enclosing
  // one, and the screen's params are the outermost scope of all. `lookup`
  // reports whether a scope *declared* the name rather than whether it held a
  // value, so a declared variable holding nothing stops the search instead of
  // falling through to a screen param that happens to share its name.
  const bindingScope = useCallback<BindingScope>(
    (path) => {
      const head = path.split(".")[0]!;
      const hit = lookup(scope, head);
      if (hit.found) return path.includes(".") ? getPath({ [head]: hit.value }, path) : hit.value;
      return getPath(runtime?.params, path);
    },
    [scope, runtime?.params],
  );
  const resolved = resolveProps(node.props, bindingScope);
  if (resolved !== node.props) node = { ...node, props: resolved };

  // Lifecycle triggers are observed on a wrapper rather than on the component,
  // because a component renders whatever element it likes and the renderer must
  // not require every one of them to forward a ref. The wrapper is only present
  // when the node actually declares a trigger, so the common tree is unchanged.
  const onAppear = resolved?.onAppear as Action | undefined;
  const onDisappear = resolved?.onDisappear as Action | undefined;
  const marker = useRef<HTMLSpanElement | null>(null);
  useLifecycle(marker, onAppear, onDisappear, runtime?.emit ?? noop);

  const Component = resolve(node.type);
  if (!Component) {
    // Report before drawing. The placeholder is the graceful half; this is the
    // half that stops a hole in a screen being a private fact of that screen.
    reportUnknownType(node.type);
    return <Unknown type={node.type} />;
  }
  const rendered = <Component node={node} />;
  if (!onAppear && !onDisappear) return rendered;
  return (
    <span ref={marker} style={CONTENTS}>
      {rendered}
    </span>
  );
}

// display:contents so the wrapper takes part in no layout — a node that reported
// its own visibility must not be laid out differently from one that does not.
const CONTENTS = { display: "contents" } as const;

function noop() {}

/** Render an ordered list of nodes (a component's `children`). */
export function Children({ nodes }: { nodes?: UINode[] }) {
  if (!nodes?.length) return null;
  return (
    <>
      {nodes.map((child, i) => (
        <Fragment key={child.id ?? i}>
          <RenderNode node={child} />
        </Fragment>
      ))}
    </>
  );
}

/** Render a named slot, which may hold one node or a list. */
export function Slot({ node, name }: { node: UINode; name: string }) {
  const slot = node.slots?.[name];
  if (!slot) return null;
  if (Array.isArray(slot)) return <Children nodes={slot} />;
  return <RenderNode node={slot} />;
}

/** Convenience: does this node have content in a given slot? */
export function hasSlot(node: UINode, name: string): boolean {
  const slot = node.slots?.[name];
  return Array.isArray(slot) ? slot.length > 0 : Boolean(slot);
}
