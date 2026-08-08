// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

package shellserver

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
	"time"
)

// indexFile is the document every deep link resolves to. The Shell is a single
// page; which screen it shows is the Platform's answer, not a path on disk.
const indexFile = "index.html"

// healthPath is the Supervisor's probe. It is deliberately not "/health": the
// Platform's handoff transport already owns that name on its own port, and two
// different shapes behind one spelling is how a probe ends up asserting the
// wrong process is alive.
const healthPath = "/healthz"

// runtimeGlobal is the property the injected configuration is published under.
// The Shell reads it in src/lib/runtime.ts; the two names are one contract and
// changing either alone silently reverts the client to same-origin.
const runtimeGlobal = "__MOSAIC_SHELL__"

// ErrNoIndex reports a build that was never run, or an embed that captured
// nothing. It is returned at construction rather than tolerated, because the
// tolerable version of this failure is a process that starts, answers its
// health probe, and serves a blank page to every user — the shape of failure
// this project treats as worse than a crash.
var ErrNoIndex = errors.New("no " + indexFile + " in the asset bundle: build the Shell before building this binary")

// Server serves the Shell. It holds the assets and the one page it has to
// rewrite; everything else is read straight out of the bundle.
type Server struct {
	assets fs.FS
	cfg    Config
	// index is index.html with the runtime configuration already injected.
	// Computed once: the configuration cannot change while the process runs,
	// so rewriting it per request would be work done for no reason.
	index []byte
	// started is the process start time, reported by the health probe so a
	// restart loop is visible to whatever is polling it.
	started time.Time
}

// runtimeConfig is what the page publishes to the client. It is deliberately
// tiny and carries nothing secret: it is readable by anyone who loads the
// page, so a credential must never be added to it.
type runtimeConfig struct {
	// PlatformURL is empty for same-origin, which is the deployed shape.
	PlatformURL string `json:"platformUrl"`
	// BootID lets a client-side report name the serving process, so a
	// support bundle can be joined to the Shell process that produced it.
	BootID string `json:"bootId"`
	// Version is the Shell binary's version, for the same reason.
	Version string `json:"version"`
}

// New builds a Server over the given asset bundle.
//
// It fails when index.html is absent rather than starting and serving nothing.
func New(assets fs.FS, cfg Config) (*Server, error) {
	raw, err := fs.ReadFile(assets, indexFile)
	if err != nil {
		return nil, ErrNoIndex
	}
	index, err := injectRuntimeConfig(raw, runtimeConfig{
		PlatformURL: cfg.PlatformURL,
		BootID:      cfg.BootID,
		Version:     Version(),
	})
	if err != nil {
		return nil, err
	}
	return &Server{assets: assets, cfg: cfg, index: index, started: time.Now()}, nil
}

// injectRuntimeConfig writes the configuration into the document as a script
// tag ahead of the module bundle, so it is set before any application code
// reads it.
//
// The value is JSON-encoded with Go's default HTML escaping left on, which
// turns `<`, `>` and `&` into their \u escapes — so a configured URL cannot
// close the script element and inject markup. That is the whole reason this
// does not use fmt.Sprintf with the raw string.
func injectRuntimeConfig(document []byte, cfg runtimeConfig) ([]byte, error) {
	encoded, err := json.Marshal(cfg)
	if err != nil {
		return nil, fmt.Errorf("encoding runtime config: %w", err)
	}
	tag := []byte("<script>window." + runtimeGlobal + "=" + string(encoded) + ";</script>")

	// Before </head> when there is one, so the global exists before the
	// module script runs. A document without a head is not a Shell build,
	// but prepending is still the answer that preserves the ordering the
	// injection exists for.
	if i := bytes.Index(document, []byte("</head>")); i >= 0 {
		out := make([]byte, 0, len(document)+len(tag))
		out = append(out, document[:i]...)
		out = append(out, tag...)
		out = append(out, document[i:]...)
		return out, nil
	}
	return append(tag, document...), nil
}

// ServeHTTP routes the three things this process does.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if r.URL.Path == healthPath {
		s.serveHealth(w, r)
		return
	}
	s.serveAsset(w, r)
}

// serveHealth answers the Supervisor's probe (ADR 0060). It reports what this
// process knows about itself and asserts nothing about the Platform: a Shell
// that says "unhealthy" because the Platform is down would take itself out of
// service exactly when it is the only process left able to render the offline
// state.
func (s *Server) serveHealth(w http.ResponseWriter, r *http.Request) {
	body, err := json.Marshal(struct {
		Status     string `json:"status"`
		Service    string `json:"service"`
		Version    string `json:"version"`
		BootID     string `json:"bootId"`
		UptimeSecs int64  `json:"uptimeSeconds"`
	}{
		Status:     "ok",
		Service:    "mosaic-shell",
		Version:    Version(),
		BootID:     s.cfg.BootID,
		UptimeSecs: int64(time.Since(s.started).Seconds()),
	})
	if err != nil {
		http.Error(w, "health encoding failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write(body)
	}
}

// serveAsset serves a file from the bundle, falling back to the index for a
// path that is a route rather than a file.
func (s *Server) serveAsset(w http.ResponseWriter, r *http.Request) {
	name := path.Clean("/" + r.URL.Path)

	if name == "/" || name == "/"+indexFile {
		s.serveIndex(w, r)
		return
	}

	content, err := fs.ReadFile(s.assets, strings.TrimPrefix(name, "/"))
	if err != nil {
		// A miss that *looks* like a file stays a miss. Returning the index
		// for a missing script would hand the browser HTML where it expected
		// JavaScript — which surfaces as a parse error naming the wrong file,
		// and hides a broken deploy behind a page that half-loads.
		if isFileRequest(name) {
			http.NotFound(w, r)
			return
		}
		s.serveIndex(w, r)
		return
	}

	if ct := contentTypeOf(name); ct != "" {
		w.Header().Set("Content-Type", ct)
	}
	w.Header().Set("Cache-Control", cacheControlFor(name))
	http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(content))
}

// serveIndex writes the pre-injected document. It is never cached: it carries
// the runtime configuration and the current bundle's script names, and a
// cached copy is how a client keeps talking to the previous deployment.
func (s *Server) serveIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	http.ServeContent(w, r, indexFile, time.Time{}, bytes.NewReader(s.index))
}

// isFileRequest reports whether a path asks for a file rather than a screen.
// Deep links are extensionless — /library, /settings/people — because the
// Shell's routes are names, so an extension is a reliable signal that the
// caller wanted bytes.
func isFileRequest(name string) bool {
	return path.Ext(name) != ""
}

// contentTypeOf resolves the type from the extension. Go's sniffing would
// answer for most of these, but not for CSS or JavaScript in a way browsers
// accept under strict MIME checking, and a bundle served as text/plain does
// not run.
func contentTypeOf(name string) string {
	switch path.Ext(name) {
	case ".js", ".mjs":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".wasm":
		return "application/wasm"
	}
	return mime.TypeByExtension(path.Ext(name))
}

// cacheControlFor gives Vite's content-hashed output a long immutable life and
// everything else a short one. The hashed names change when the content does,
// so caching them for a year is safe and is what makes a repeat visit cheap;
// an unhashed icon must not be pinned for a year in anybody's browser.
func cacheControlFor(name string) string {
	if strings.HasPrefix(name, "/assets/") {
		return "public, max-age=31536000, immutable"
	}
	return "public, max-age=300"
}
