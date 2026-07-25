// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * What this client can render, declared to the Platform on Attach
 * (mosaic.session.v1.VocabularyProfile).
 *
 * It is the other half of what `profile.ts` answers. That one says what this
 * browser can *decode*; this says what it can *draw*. Both ride Attach because
 * neither can change without a reconnect, and both were previously guesses the
 * server made on the client's behalf — with the same consequence, that the
 * server's assumption and the client's reality had nowhere to meet.
 *
 * Nothing here is a list somebody maintains. The primitives are the keys of the
 * runtime's own registration map; the action kinds are checked against its
 * dispatcher at compile time; the version comes from the contract package this
 * Shell is built against. A declaration assembled from three derived facts
 * cannot drift from the client it describes — which matters more here than
 * anywhere, because the failure mode of a wrong declaration is a screen the
 * server carefully degraded for abilities this client actually had.
 */

import { nativePrimitives, NATIVE_ACTION_KINDS } from "@mosaic-media/sdui-react";
import { vocabularyVersion } from "@mosaic-media/sdui/vocabulary";

/** The declaration as the session contract carries it. */
export interface VocabularyProfile {
  version: string;
  primitives: string[];
  actions: string[];
}

/**
 * The vocabulary this client implements.
 *
 * `version` is the edition of the contract it was built against, not a claim to
 * implement all of it — the sets below are the precise answer, and they are
 * deliberately smaller. The Platform reads it the same way: it filters on the
 * sets and records the version, so a client running behind the contract is
 * visible in a log line before it is visible as a screen with a hole in it.
 */
export function clientVocabulary(): VocabularyProfile {
  return {
    version: vocabularyVersion,
    primitives: nativePrimitives,
    actions: [...NATIVE_ACTION_KINDS],
  };
}
