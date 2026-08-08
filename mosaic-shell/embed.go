// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

package main

import (
	"embed"
	"io/fs"
)

// bundle holds the built Shell.
//
// `webassets/` is populated by scripts/build-shell-binary.sh from
// packages/shell/dist and is git-ignored apart from its .gitkeep — the
// directory is committed empty so this file always compiles, and the binary
// refuses to start when the build was skipped (shellserver.ErrNoIndex) rather
// than serving a blank page. The `all:` prefix is required: without it `embed`
// silently drops files beginning with `.` or `_`, and Vite emits neither today
// but a plugin that does would go missing with no error.
//
// It is not a `dist/` directory on purpose. The workspace's .gitignore ignores
// `dist/` everywhere, and a build output directory that must keep one tracked
// file is a fight with that rule every time somebody reads it.
//
//go:embed all:webassets
var bundle embed.FS

// shellAssets returns the bundle rooted at the Shell's index, so a request for
// "/assets/index-abc.js" reads "webassets/assets/index-abc.js" without every
// caller knowing the prefix.
func shellAssets() (fs.FS, error) { return fs.Sub(bundle, "webassets") }
