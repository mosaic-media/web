import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/styles/tokens.css";
import "@/styles/global.css";
import "@/styles/components.css";

import { installComponents } from "@/components";
import { App } from "@/App";

// Register the built-in SDUI vocabulary before first render.
installComponents();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
