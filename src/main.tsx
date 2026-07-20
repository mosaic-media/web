// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@mosaic-media/sdui-react/styles.css";

import { installComponents } from "@mosaic-media/sdui-react";
import { installMockModuleComponents } from "@/mock/moduleComponents";
import { App } from "@/App";

// Register the built-in SDUI vocabulary, then a simulated module's own
// primitive-composed components, before first render.
installComponents();
installMockModuleComponents();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
