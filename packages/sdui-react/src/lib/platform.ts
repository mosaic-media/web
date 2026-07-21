// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

/*
 * Thin GraphQL client for the Mosaic Platform (default :8081/graphql, proxied
 * through Vite in dev). The live Shell runs on the two-lane Connect
 * SessionService (ADR 0041); this client remains for the request/response path —
 * dev sign-in (minting a session), and the one-shot invoke/query fallback the
 * runtime uses when it is NOT driven by a live session (e.g. the storybook).
 *
 * Errors are normalised into the Platform's fixed categories so the Shell's
 * feedback components render uniformly regardless of transport detail.
 */

import type { PlatformErrorCategory } from "../sdui/types";

const ENDPOINT = "/graphql";

export interface GraphQLError {
  category: PlatformErrorCategory;
  message: string;
}

export class PlatformError extends Error {
  category: PlatformErrorCategory;
  constructor(category: PlatformErrorCategory, message: string) {
    super(message);
    this.category = category;
    this.name = "PlatformError";
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { category?: string } }>;
}

/** Session token, if signed in. Kept in memory for the skeleton. */
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new PlatformError("Unavailable", "Could not reach the Platform.");
  }

  if (!res.ok) {
    throw new PlatformError(httpToCategory(res.status), `Platform returned ${res.status}.`);
  }

  const body = (await res.json()) as GraphQLResponse<T>;
  if (body.errors?.length) {
    const first = body.errors[0];
    throw new PlatformError(normaliseCategory(first.extensions?.category), first.message);
  }
  if (body.data === undefined) {
    throw new PlatformError("Internal", "Platform returned no data.");
  }
  return body.data;
}

function httpToCategory(status: number): PlatformErrorCategory {
  switch (status) {
    case 400:
      return "InvalidArgument";
    case 401:
      return "Unauthenticated";
    case 403:
      return "PermissionDenied";
    case 404:
      return "NotFound";
    case 409:
      return "Conflict";
    case 503:
      return "Unavailable";
    default:
      return "Internal";
  }
}

function normaliseCategory(raw?: string): PlatformErrorCategory {
  const known: PlatformErrorCategory[] = [
    "InvalidArgument",
    "Unauthenticated",
    "PermissionDenied",
    "NotFound",
    "Conflict",
    "Unavailable",
    "Internal",
  ];
  return known.find((c) => c === raw) ?? "Internal";
}
