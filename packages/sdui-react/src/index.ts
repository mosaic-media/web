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
export { register, registerAll, resolve, registeredTypes, prop, onUnknownType, resetUnknownTypes } from "./sdui/registry";
export type { NodeComponent, NodeComponentProps } from "./sdui/registry";

// Recursive renderer.
export { RenderNode, Children, Slot, hasSlot } from "./sdui/Renderer";

// Bindable props (ADR 0086): a prop value may be a literal or a binding this
// runtime resolves where the node renders.
export { isBinding, bindingPath, resolveProps, BINDING_MARKER } from "./sdui/binding";
export type { Binding } from "./sdui/binding";

// Component definitions (data → components).
export { defineComponent, defineComponents } from "./sdui/template";
// The served design tokens (ADR 0040): the Platform pushes them, the client
// applies them. Values are the contract's; this only writes them down.
export { applyTokens, type TokenSet } from "./sdui/tokens";
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
export { installComponents, NATIVE_COMPONENTS } from "./components";

// What this client declares it can render (mosaic.session.v1.VocabularyProfile).
// Derived from the registration map and checked against the dispatcher at
// compile time — see sdui/vocabulary.ts.
export { nativePrimitives, NATIVE_PRIMITIVE_TYPES, NATIVE_ACTION_KINDS } from "./sdui/vocabulary";
export type { NativePrimitiveType, NativeActionKind, VocabularyDeclaration } from "./sdui/vocabulary";
export { OverlayHost, ToastHost } from "./components/host";
export { Icon, cx } from "./components/shared";
export type { IconName } from "./components/shared";
