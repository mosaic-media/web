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
 * The same declaration rides both calls here that rides Attach, so the server
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
import { deviceID, saveSession, storedFrom, type StoredSession } from "./session";

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

/** What a doorway action produced.
 *
 *  Exactly one of the three is set, because the server's own response is a
 *  oneof: an action either signed the caller in, replaced the door, or was
 *  refused on the fields it came from. A client that had to rank them would be
 *  a client that could get the ranking wrong. */
export interface DoorwayOutcome {
  session?: StoredSession;
  doorway?: UINode;
  fieldErrors?: { errors: Record<string, string>; formError: string };
}

/**
 * Runs a doorway action and returns what it produced.
 *
 * **This client interprets none of them.** It sends the name the server wrote
 * into the tree and applies whichever outcome comes back; it does not know what
 * "signIn" means and must not learn, because a client that did would be a
 * client that had to be released before the door could change.
 *
 * The device id rides the request rather than the input, because a session
 * belongs to a device whatever the action was — and an action that mints one
 * must not have to remember to say so.
 *
 * A replacement door brings its own definitions and they are registered before
 * the tree is returned, for the same reason the bootstrap registers its own:
 * a door this client has not seen may name a component it was not sent, and a
 * tree rendered ahead of its components draws placeholders.
 */
export async function invokeDoorway(action: string, input: unknown): Promise<DoorwayOutcome> {
  const client = createClient(AuthService, transport);
  const res = await client.invoke({
    action,
    input: new TextEncoder().encode(JSON.stringify(input ?? {})),
    deviceId: deviceID(),
    vocabulary: clientVocabulary(),
  });

  switch (res.outcome.case) {
    case "signed": {
      const tokens = res.outcome.value.tokens;
      if (!tokens?.accessToken || !tokens.refreshToken) {
        throw new Error("The Platform signed this device in with no credential pair.");
      }
      const stored = storedFrom(tokens);
      saveSession(stored);
      return { session: stored };
    }
    case "doorway": {
      const door = res.outcome.value;
      if (door.definitions.length > 0) {
        defineComponents(JSON.parse(new TextDecoder().decode(door.definitions)));
      }
      if (!door.uiNode) throw new Error("The Platform replaced the doorway with nothing.");
      return { doorway: toStructural(door.uiNode as WireNode) };
    }
    case "fieldErrors": {
      const value = res.outcome.value;
      const errors: Record<string, string> = {};
      for (const e of value.errors) errors[e.field] = e.message;
      return { fieldErrors: { errors, formError: value.formError } };
    }
    default:
      // A response with no outcome is a server that answered without answering.
      // Worth a message rather than a silent no-op: the button somebody pressed
      // would otherwise appear to do nothing at all.
      throw new Error("The Platform answered that action with nothing.");
  }
}
