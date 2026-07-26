// @mosaic-media/sdui-react — the React runtime for the Mosaic SDUI contract.
// The web binding: primitives, the registry, the recursive renderer, the
// definition expander, the runtime context/provider, the token-driven skin, and
// the built-in component vocabulary. Consumed by the Shell app and by
// the storybook package. It is a *client implementation* (AGPL-3.0-only), distinct
// from the technology-agnostic contract in @mosaic-media/sdui.
//
// Styles ship separately: import "@mosaic-media/sdui-react/styles.css".

// Contract-shaped types.
export type { UINode, Action, Tone, ActionResult, PlatformErrorCategory } from "./sdui/types.js";

// Registry.
export { register, registerAll, resolve, registeredTypes, prop, onUnknownType, resetUnknownTypes } from "./sdui/registry.js";
export type { NodeComponent, NodeComponentProps } from "./sdui/registry.js";

// Recursive renderer.
export { RenderNode, Children, Slot, hasSlot } from "./sdui/Renderer.js";

// Bindable props (ADR 0086): a prop value may be a literal or a binding this
// runtime resolves where the node renders.
export { isBinding, bindingPath, resolveProps, BINDING_MARKER } from "./sdui/binding.js";
export type { BindingScope } from "./sdui/binding.js";

// State scopes (ADR 0087): named variables a subtree binds to and writes.
export { StateScope, ScopeContext, lookup, write, collect, coerce } from "./sdui/scope.js";
export { useField, useFieldError, useVisible, asString, asNumber, asBoolean } from "./sdui/field.js";

// The six validators and the six predicates (ADR 0089), closed sets both.
export { validateField, evaluate, VALIDATORS, PREDICATES } from "./sdui/validate.js";
// The submit merge (ADR 0096): which value wins when a form and the action it
// carries both name a field. Exported because it is a contract rule a second
// client must reproduce, and because the conformance corpus runs it.
export { mergeSubmit } from "./sdui/submit.js";

// Lifecycle triggers (ADR 0090): what a node does when it is actually seen.
export { useLifecycle, VISIBILITY_THRESHOLD } from "./sdui/lifecycle.js";

// Accessibility (ADR 0091): the contract's role/name/level/live props, mapped.
export { a11yAttrs, ROLES } from "./sdui/a11y.js";

// Focus and spatial navigation (ADR 0092): the geometry a remote control needs.
export { nearestInDirection, focusablesIn, applyRoving } from "./sdui/focus.js";
export type { FocusDirection } from "./sdui/focus.js";
export { useFocusBehaviour } from "./sdui/useFocusable.js";

// Lazy lists (ADR 0093): a page of something longer, and what fetches the next.
export { useLazyList, PREFETCH_MARGIN_PX } from "./sdui/paging.js";
export type { A11yAttrs } from "./sdui/a11y.js";
export type { RuleSet, Predicate } from "./sdui/validate.js";
export type { Scope, StateVar } from "./sdui/scope.js";
export type { Binding } from "./sdui/binding.js";

// Component definitions (data → components).
export { defineComponent, defineComponents, expandOnce, expandAll } from "./sdui/template.js";
// The served design tokens (ADR 0040): the Platform pushes them, the client
// applies them. Values are the contract's; this only writes them down.
export { applyTokens, type TokenSet } from "./sdui/tokens.js";
export type { ComponentDefinition } from "./sdui/template.js";

// Runtime context + provider.
export { ShellProvider } from "./sdui/ShellProvider.js";
export type { ToastItem } from "./sdui/ShellProvider.js";
export { useRuntime, ShellRuntimeContext } from "./sdui/context.js";
export type { ShellRuntime, OverlayHandle } from "./sdui/context.js";

// Token-based style vocabulary.
export { boxToCss, textToCss } from "./sdui/style.js";
export type { BoxStyle, TextStyle, ColorToken, SpaceToken, RadiusToken } from "./sdui/style.js";

// Art-light: the artwork-driven ambient "refraction" wash. The Image primitive
// drives it via `artLight`; consumers only need refreshArtLight() on theme change.
export {
  sampleArtColors,
  sampleArtLight,
  setAmbientArt,
  focusArt,
  releaseArt,
  clearAmbientArt,
  refreshArtLight,
  currentLightMap,
  sampleLab,
  rgbToLab,
  labToRgb,
} from "./sdui/artlight.js";
export type { Rgb, Lab, LightMap, ArtSample } from "./sdui/artlight.js";

// The built-in component vocabulary (primitives + definitions).
export { installComponents, NATIVE_COMPONENTS } from "./components/index.js";

// What this client declares it can render (mosaic.session.v1.VocabularyProfile).
// Derived from the registration map and checked against the dispatcher at
// compile time — see sdui/vocabulary.ts.
export { nativePrimitives, NATIVE_PRIMITIVE_TYPES, NATIVE_ACTION_KINDS } from "./sdui/vocabulary.js";
export type { NativePrimitiveType, NativeActionKind, VocabularyDeclaration } from "./sdui/vocabulary.js";
export { OverlayHost, ToastHost } from "./components/host.js";
export { Icon, cx } from "./components/shared.js";
export type { IconName } from "./components/shared.js";
