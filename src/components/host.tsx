// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Host renderers for ambient surfaces the ShellProvider owns: the overlay stack
 * (modal / sheet / drawer) and the toast stack. These aren't in the registry —
 * the Shell mounts them once, around the routed screen.
 */

import type { OverlayHandle } from "@/sdui/context";
import { RenderNode } from "@/sdui/Renderer";
import type { ToastItem } from "@/sdui/ShellProvider";
import { cx, Icon } from "./shared";

export function OverlayHost({
  overlays,
  onDismiss,
}: {
  overlays: OverlayHandle[];
  onDismiss: () => void;
}) {
  if (overlays.length === 0) return null;
  const top = overlays[overlays.length - 1];
  return (
    <div className={cx("msc-overlay", `msc-overlay--${top.surface}`)}>
      <div className="msc-overlay__scrim" onClick={onDismiss} />
      <div className="msc-overlay__panel" role="dialog" aria-modal="true">
        <button className="msc-overlay__close" aria-label="Close" onClick={onDismiss}>
          <Icon name="close" />
        </button>
        <div className="msc-overlay__content">
          <RenderNode node={top.node} />
        </div>
      </div>
    </div>
  );
}

export function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="msc-toasts" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={cx("msc-toast", `msc-toast--${t.tone}`)}>
          <span className="msc-toast__message">{t.message}</span>
          <button className="msc-toast__close" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
            <Icon name="close" />
          </button>
        </div>
      ))}
    </div>
  );
}
