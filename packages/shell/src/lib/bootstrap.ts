// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * The pre-session bootstrap (ADR 0101).
 *
 * This is the first call this client makes, before it has anything. It answers
 * with the skin, the definitions the doorway needs and the doorway itself, and
 * the Shell renders nothing until it arrives.
 *
 * It exists because a client without a session has no vocabulary at all.
 * Definitions and the token set are pushed on connect — which is to say after a
 * session exists — and this client deliberately bundles neither (ADR 0082), so
 * a screen drawn before a session had no components and no skin. That is not a
 * hypothetical: the sign-in screen was built and withdrawn on the same day,
 * because the Platform served exactly the right tree and the browser drew
 * "SignInPanel — not registered in this Shell" on an unstyled page.
 *
 * The same declaration rides this call that rides Attach, so the server
 * negotiates the doorway exactly as it negotiates every screen after it — one
 * declaration, not a second copy that could drift.
 */

import { createClient } from "@connectrpc/connect";
import { AuthService } from "@mosaic-media/sdui/auth";
import { applyTokens, defineComponents, type UINode } from "@mosaic-media/sdui-react";
import type { UINode as WireNode } from "@mosaic-media/sdui/sdui-pb";
import { clientVocabulary } from "./vocabulary";
import { toStructural } from "./node";
import { transport } from "./transport";

/** The doorway, ready to render: the tree, with its skin and its components
 *  already applied to this client. */
export interface Doorway {
  tree: UINode;
}

/**
 * Fetches the doorway and applies everything needed to draw it.
 *
 * The order is the point and it is the server's order: tokens before
 * definitions before the tree. A client that rendered and then restyled would
 * flash the skin it shipped with, and one that rendered before registering the
 * components would draw an Unknown placeholder for every one of them — which is
 * the exact pair of failures this call was created to remove.
 */
export async function fetchDoorway(signal?: AbortSignal): Promise<Doorway> {
  const client = createClient(AuthService, transport);
  const res = await client.bootstrap({ vocabulary: clientVocabulary() }, { signal });

  const decoder = new TextDecoder();
  if (res.tokens.length > 0) applyTokens(JSON.parse(decoder.decode(res.tokens)));
  if (res.definitions.length > 0) defineComponents(JSON.parse(decoder.decode(res.definitions)));

  if (!res.uiNode) throw new Error("The Platform answered the bootstrap with no doorway.");
  return { tree: toStructural(res.uiNode as WireNode) };
}
