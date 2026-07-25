// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@mosaic-media/sdui-react/styles.css";
// The no-session states, after the token skin so they can read its variables.
import "@/standby.css";

import { installComponents, onUnknownType } from "@mosaic-media/sdui-react";
import { installMockModuleComponents } from "@/mock/moduleComponents";
import { currentTraceId } from "@/lib/trace";
import { App } from "@/App";

// Register the built-in SDUI vocabulary, then a simulated module's own
// primitive-composed components, before first render.
installComponents();
installMockModuleComponents();

/*
 * A node this client cannot render is now reported rather than only drawn.
 *
 * The placeholder stays — an old client shown a new type must degrade, not
 * throw. What it never did was *say* anything, so a screen with a hole in it
 * looked exactly like a screen without one to everyone but the person on that
 * page. The Platform now knows what this client declared and declines to send
 * what it cannot draw, so a placeholder means something specific went wrong:
 * a module's own type, a definition served to a client it was not filtered for,
 * or a declaration that is lying.
 *
 * It goes to the console with the current trace id, because there is no
 * client-to-server telemetry lane to put it on. Building one is a decision about
 * what a client may report unprompted, and it belongs with the per-node identity
 * that would make such a report attributable — not here.
 */
onUnknownType((type) => {
  console.warn(`[mosaic] unrenderable node type "${type}" (trace ${currentTraceId() ?? "none"})`);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
