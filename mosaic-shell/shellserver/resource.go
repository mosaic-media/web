// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

package shellserver

import (
	"crypto/rand"
	"encoding/hex"
	"runtime/debug"
)

// newID returns a short random hex identifier, matching the Platform's
// telemetry resource ids so the two processes' boot ids look alike in a log
// somebody is reading across both (ADR 0060).
//
// A failure to read entropy yields an empty id rather than taking the process
// down: an unnamed boot is a degraded log, not a reason to refuse to serve a
// client. This mirrors internal/platform/telemetry/resource.go deliberately —
// the same decision, made the same way, in the other process.
func newID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return hex.EncodeToString(b)
}

// Version reports the version that was actually linked, read from the build
// graph rather than a hand-maintained constant which nothing forces to agree
// with anything. This is the same rule the modules follow for
// v1.ModuleVersion.
//
// A `go build` from a working tree has no version stamp, so "unknown" is the
// honest answer there rather than a fabricated 0.0.0.
func Version() string {
	info, ok := debug.ReadBuildInfo()
	if !ok || info.Main.Version == "" {
		return "unknown"
	}
	return info.Main.Version
}
