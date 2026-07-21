# web

Mosaic's web client workspace — three independently published packages in one repo ([ADR 0042](https://github.com/mosaic-media/architecture/blob/main/docs/adr/0042-frontend-workspace.md)):

- **`packages/sdui-react`** — `@mosaic-media/sdui-react`, the React SDUI runtime (primitives, recursive renderer, definition expander, `ShellProvider`, token-driven skin). Published to npm.
- **`packages/shell`** — the Shell: the chrome/routing app on top of the runtime.
- **`packages/storybook`** — a live, bespoke showcase of every component rendered beside the `UINode` payload that produced it.

The runtime is a peer, not a subordinate — no app is privileged. A consumer of `@mosaic-media/sdui-react` pulls only the runtime; the Shell and the storybook are sibling workspace packages, never transitive dependencies of it. The shared SDUI *contract* (`@mosaic-media/sdui`) lives in its own repo and is consumed here from npm.

## Working locally

```sh
npm install   # links @mosaic-media/sdui-react into the Shell and storybook via workspaces
```

Licensed AGPL-3.0-only.
