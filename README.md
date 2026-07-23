# web

Mosaic's web client workspace — three independently published packages in one repo ([ADR 0042](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0042-frontend-workspace.md)):

- **`packages/sdui-react`** — `@mosaic-media/sdui-react`, the React SDUI runtime (primitives, recursive renderer, definition expander, `ShellProvider`, token-driven skin). Published to npm.
- **`packages/shell`** — the Shell: the chrome/routing app on top of the runtime.
- **`packages/storybook`** — a live, bespoke showcase of every component rendered beside the `UINode` payload that produced it.

The runtime is a peer, not a subordinate — no app is privileged. A consumer of `@mosaic-media/sdui-react` pulls only the runtime; the Shell and the storybook are sibling workspace packages, never transitive dependencies of it. The shared SDUI *contract* (`@mosaic-media/sdui`) lives in its own repo and is consumed here from npm.

## Working locally

**Everything runs in a container; nothing is installed, built or run on the
host.** The gate — version check, install, build and typecheck across every
workspace package — is one command:

```sh
docker compose -f docker-compose.test.yml run --rm test
```

Append `bash` for a shell in the same environment. The install (`npm install`
links `@mosaic-media/sdui-react` into the Shell and storybook via workspaces)
happens inside it, into named volumes, so it never writes a `node_modules` onto
the host checkout — a host-side install leaves platform-native binaries where
the dev stack then mounts Linux ones, and the breakage points anywhere but at
its cause.

**To see the client**, run the dev stack — it lives in the [`platform`](https://github.com/mosaic-media/platform)
repository and brings the Shell, the Platform and its database up together, with
the Shell on `:5173`:

```sh
docker compose -f docker-compose.dev.yml up
```

Licensed AGPL-3.0-only.
