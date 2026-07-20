// @mosaic-media/sdui-react — the React runtime for the Mosaic SDUI contract.
// The web binding: primitives, the registry, the recursive renderer, the
// definition expander, the runtime context/provider, the token-driven skin, and
// the built-in component vocabulary. Consumed by the Shell app and by
// mosaic-storybook. It is a *client implementation* (AGPL-3.0-only), distinct
// from the technology-agnostic contract in @mosaic-media/sdui.
//
// Styles ship separately: import "@mosaic-media/sdui-react/styles.css".

// Contract-shaped types.
export type { UINode, Action, Tone, ActionResult, PlatformErrorCategory } from "./sdui/types";

// Registry.
export { register, registerAll, resolve, registeredTypes, prop } from "./sdui/registry";
export type { NodeComponent, NodeComponentProps } from "./sdui/registry";

// Recursive renderer.
export { RenderNode, Children, Slot, hasSlot } from "./sdui/Renderer";

// Component definitions (data → components).
export { defineComponent, defineComponents } from "./sdui/template";
export type { ComponentDefinition } from "./sdui/template";

// Runtime context + provider.
export { ShellProvider } from "./sdui/ShellProvider";
export type { ToastItem } from "./sdui/ShellProvider";
export { useRuntime, ShellRuntimeContext } from "./sdui/context";
export type { ShellRuntime, OverlayHandle } from "./sdui/context";

// Token-based style vocabulary.
export { boxToCss, textToCss } from "./sdui/style";
export type { BoxStyle, TextStyle, ColorToken, SpaceToken, RadiusToken } from "./sdui/style";

// Art-light: the artwork-driven ambient "refraction" wash. The Image primitive
// drives it via `artLight`; consumers only need refreshArtLight() on theme change.
export { sampleArtColors, setAmbientArt, focusArt, releaseArt, clearAmbientArt, refreshArtLight } from "./sdui/artlight";
export type { Rgb } from "./sdui/artlight";

// The built-in component vocabulary (primitives + definitions).
export { installComponents } from "./components";
export { OverlayHost, ToastHost } from "./components/host";
export { Icon, cx } from "./components/shared";
export type { IconName } from "./components/shared";

// GraphQL client used by ShellProvider to run invoke/query actions.
export { gql, PlatformError, setAuthToken } from "./lib/platform";
export type { GraphQLError } from "./lib/platform";
