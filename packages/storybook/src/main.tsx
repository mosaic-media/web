import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { installComponents, defineComponents } from "@mosaic-media/sdui-react";
import { DEFINITIONS } from "@mosaic-media/sdui/definitions";
import "@mosaic-media/sdui-react/styles.css";
import "./storybook.css";

import { installModuleExamples } from "./moduleExamples";
import { App } from "./App";

// The native vocabulary comes from the runtime; the COMPONENTS come from the
// contract, exactly as they reach a running client — the Platform pushes this
// same library over the session (ADR 0040). The storybook has no Platform to ask,
// so it imports the library directly rather than keeping a copy of its own: a
// second copy is how the published contract's components went stale while the
// client's diverged.
installComponents();
defineComponents(DEFINITIONS);
installModuleExamples();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
