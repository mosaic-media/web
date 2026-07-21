// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Live screen loading. The Platform emits SDUI screens through a GraphQL
 * screen(name, params) query (ADR 0029), returning the UINode tree as JSON.
 * This fetches and parses it; the renderer treats it identically to a mock
 * payload. LIVE_SCREENS names the screens the Platform emits today — anything
 * else falls back to the mock map in the Shell chrome.
 */

import { gql } from "@mosaic-media/sdui-react";
import type { UINode } from "@mosaic-media/sdui-react";

/** Screens the Platform emits (ADR 0029). Others stay mock for now. */
export const LIVE_SCREENS = new Set(["search", "collections", "catalog", "detail"]);

interface ScreenResult {
  screen: string;
}

/** Fetches a server-emitted screen and parses its UINode tree. */
export async function fetchScreen(
  name: string,
  params: Record<string, unknown> | undefined,
  session: string,
): Promise<UINode> {
  const data = await gql<ScreenResult>(
    `query Screen($name: String!, $params: String, $sid: String!) {
       screen(name: $name, params: $params, callerSessionId: $sid)
     }`,
    { name, params: params ? JSON.stringify(params) : null, sid: session },
  );
  return JSON.parse(data.screen) as UINode;
}
