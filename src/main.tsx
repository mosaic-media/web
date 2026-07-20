import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { installComponents } from "@mosaic-media/sdui-react";
import "@mosaic-media/sdui-react/styles.css";
import "./storybook.css";

import { installModuleExamples } from "./moduleExamples";
import { App } from "./App";

// Register the built-in SDUI vocabulary, then a simulated module's components.
installComponents();
installModuleExamples();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
