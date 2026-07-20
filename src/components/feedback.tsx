/*
 * Feedback & state components. The parts a media UI forgets until they hurt:
 * loading skeletons, empty states, error states (mapped to Platform error
 * categories), inline banners, badges and status dots.
 */

import type { Action, PlatformErrorCategory, Tone, UINode } from "@/sdui/types";
import { prop } from "@/sdui/registry";
import { Slot, hasSlot } from "@/sdui/Renderer";
import { useRuntime } from "@/sdui/context";
import { cx, Icon, type IconName } from "./shared";

const TONE_ICON: Record<Tone, IconName> = {
  neutral: "info",
  accent: "info",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
};

/** How each Platform error category presents. */
const CATEGORY: Record<PlatformErrorCategory, { tone: Tone; title: string }> = {
  InvalidArgument: { tone: "warning", title: "That didn't look right" },
  Unauthenticated: { tone: "info", title: "Please sign in" },
  PermissionDenied: { tone: "warning", title: "Not allowed" },
  NotFound: { tone: "neutral", title: "Nothing here" },
  Conflict: { tone: "warning", title: "Already exists" },
  Unavailable: { tone: "danger", title: "Platform unavailable" },
  Internal: { tone: "danger", title: "Something went wrong" },
};

/** Skeleton — shimmer placeholder. `shape` picks a preset silhouette. */
export function Skeleton({ node }: { node: UINode }) {
  const shape = prop<"poster" | "line" | "block" | "circle">(node, "shape", "block");
  const count = prop<number>(node, "count", 1);
  return (
    <div className={cx("msc-skeleton-group", shape === "poster" && "msc-skeleton-group--rail")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cx("msc-skeleton", `msc-skeleton--${shape}`)} />
      ))}
    </div>
  );
}

export function EmptyState({ node }: { node: UINode }) {
  const icon = prop<IconName>(node, "icon", "grid");
  const title = prop<string>(node, "title", "Nothing here yet");
  const message = prop<string | undefined>(node, "message", undefined);
  return (
    <div className="msc-empty">
      <span className="msc-empty__icon">
        <Icon name={icon} />
      </span>
      <h3 className="msc-empty__title">{title}</h3>
      {message && <p className="msc-empty__message">{message}</p>}
      {hasSlot(node, "action") && (
        <div className="msc-empty__action">
          <Slot node={node} name="action" />
        </div>
      )}
    </div>
  );
}

export function ErrorState({ node }: { node: UINode }) {
  const { emit } = useRuntime();
  const category = prop<PlatformErrorCategory>(node, "category", "Internal");
  const message = prop<string | undefined>(node, "message", undefined);
  const retry = prop<Action | undefined>(node, "retry", undefined);
  const preset = CATEGORY[category];
  return (
    <div className={cx("msc-errorstate", `msc-errorstate--${preset.tone}`)}>
      <Icon name={TONE_ICON[preset.tone]} className="msc-errorstate__icon" />
      <h3 className="msc-errorstate__title">{preset.title}</h3>
      {message && <p className="msc-errorstate__message">{message}</p>}
      <p className="msc-errorstate__category">{category}</p>
      {retry && (
        <button className="msc-btn msc-btn--secondary" onClick={() => emit(retry)}>
          <span>Try again</span>
        </button>
      )}
    </div>
  );
}

export function Banner({ node }: { node: UINode }) {
  const tone = prop<Tone>(node, "tone", "info");
  const title = prop<string | undefined>(node, "title", undefined);
  const message = prop<string>(node, "message", "");
  return (
    <div className={cx("msc-banner", `msc-banner--${tone}`)} role="status">
      <Icon name={TONE_ICON[tone]} className="msc-banner__icon" />
      <div className="msc-banner__body">
        {title && <strong className="msc-banner__title">{title}</strong>}
        <span className="msc-banner__message">{message}</span>
      </div>
    </div>
  );
}

export function Badge({ node }: { node: UINode }) {
  const label = prop<string>(node, "label", "");
  const tone = prop<Tone>(node, "tone", "neutral");
  return <span className={cx("msc-badge", `msc-badge--${tone}`)}>{label}</span>;
}

export function StatusIndicator({ node }: { node: UINode }) {
  const tone = prop<Tone>(node, "tone", "neutral");
  const label = prop<string | undefined>(node, "label", undefined);
  return (
    <span className="msc-status">
      <span className={cx("msc-status__dot", `msc-status__dot--${tone}`)} />
      {label && <span className="msc-status__label">{label}</span>}
    </span>
  );
}
