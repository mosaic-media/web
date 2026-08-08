// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

package shellserver

import (
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

// bundle is a stand-in for what Vite emits: a document, a content-hashed
// script under assets/, and an unhashed icon at the root.
func bundle() fs.FS {
	return fstest.MapFS{
		"index.html":              &fstest.MapFile{Data: []byte("<!doctype html><html><head><title>Mosaic Shell</title></head><body><div id=\"root\"></div></body></html>")},
		"assets/index-abc123.js":  &fstest.MapFile{Data: []byte("export const x = 1;")},
		"assets/index-abc123.css": &fstest.MapFile{Data: []byte(":root{}")},
		"mosaic-icon-dark.png":    &fstest.MapFile{Data: []byte("\x89PNG\r\n\x1a\n")},
	}
}

func newTestServer(t *testing.T, cfg Config) *Server {
	t.Helper()
	s, err := New(bundle(), cfg)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	return s
}

func get(t *testing.T, s *Server, target string) *http.Response {
	t.Helper()
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
	return rec.Result()
}

// A bundle that was never built must stop the process at construction. The
// tolerable-looking alternative — start anyway — is a Shell that answers its
// health probe while serving every user a blank page.
func TestNewRefusesABundleWithNoIndex(t *testing.T) {
	_, err := New(fstest.MapFS{"assets/index-abc123.js": &fstest.MapFile{Data: []byte("")}}, Config{})
	if !errors.Is(err, ErrNoIndex) {
		t.Fatalf("want ErrNoIndex, got %v", err)
	}
}

// The whole point of this binary: the endpoint is set when the process starts,
// not when the bundle was built.
func TestIndexCarriesTheRuntimePlatformURL(t *testing.T) {
	s := newTestServer(t, Config{PlatformURL: "https://mosaic.example:8443", BootID: "boot-1"})

	resp := get(t, s, "/")
	body := readBody(t, resp)

	if !strings.Contains(body, "https://mosaic.example:8443") {
		t.Errorf("index does not carry the configured platform URL:\n%s", body)
	}
	if !strings.Contains(body, "window."+runtimeGlobal) {
		t.Errorf("index does not publish the runtime global:\n%s", body)
	}
	// Ahead of </head>, so the global is set before any module script runs.
	if idx, head := strings.Index(body, runtimeGlobal), strings.Index(body, "</head>"); idx == -1 || idx > head {
		t.Errorf("runtime config is not injected before </head> (config at %d, head at %d)", idx, head)
	}
}

// Same-origin is the deployed shape behind the Supervisor's front door, and it
// must be expressed as an empty string rather than a guessed hostname.
func TestSameOriginIsEmptyRatherThanGuessed(t *testing.T) {
	s := newTestServer(t, Config{BootID: "boot-1"})

	var cfg runtimeConfig
	if err := json.Unmarshal([]byte(extractRuntimeJSON(t, readBody(t, get(t, s, "/")))), &cfg); err != nil {
		t.Fatalf("runtime config is not valid JSON: %v", err)
	}
	if cfg.PlatformURL != "" {
		t.Errorf("want an empty platform URL for same-origin, got %q", cfg.PlatformURL)
	}
	if cfg.BootID != "boot-1" {
		t.Errorf("want the configured boot id, got %q", cfg.BootID)
	}
}

// The injected value is JSON with HTML escaping left on, so a value containing
// markup cannot close the script element. Validation already refuses a
// non-http(s) URL, but the escaping is what makes that a second line of
// defence rather than the only one.
func TestInjectionCannotCloseTheScriptElement(t *testing.T) {
	out, err := injectRuntimeConfig(
		[]byte("<html><head></head><body></body></html>"),
		runtimeConfig{PlatformURL: "https://x/</script><script>alert(1)</script>"},
	)
	if err != nil {
		t.Fatalf("injectRuntimeConfig: %v", err)
	}
	if strings.Contains(string(out), "</script><script>") {
		t.Errorf("injection let markup through:\n%s", out)
	}
}

// A refresh on a deep link is the case this fallback exists for.
func TestDeepLinkServesTheIndex(t *testing.T) {
	s := newTestServer(t, Config{})

	for _, target := range []string{"/library", "/settings/people", "/detail/abc-123"} {
		resp := get(t, s, target)
		if resp.StatusCode != http.StatusOK {
			t.Errorf("%s: want 200, got %d", target, resp.StatusCode)
		}
		if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
			t.Errorf("%s: want html, got %q", target, ct)
		}
	}
}

// A missing *file* stays missing. Serving the index for a missing script hands
// the browser HTML where it expected JavaScript, which reports as a syntax
// error in the wrong file and hides a broken deploy behind a half-loaded page.
func TestAMissingFileIsNotTheIndex(t *testing.T) {
	s := newTestServer(t, Config{})

	for _, target := range []string{"/assets/index-deadbeef.js", "/assets/missing.css", "/nope.png"} {
		resp := get(t, s, target)
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("%s: want 404, got %d", target, resp.StatusCode)
		}
	}
}

func TestHashedAssetsAreImmutableAndTypedCorrectly(t *testing.T) {
	s := newTestServer(t, Config{})

	resp := get(t, s, "/assets/index-abc123.js")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("want 200, got %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "text/javascript") {
		t.Errorf("a bundle served as %q does not run under strict MIME checking", ct)
	}
	if cc := resp.Header.Get("Cache-Control"); !strings.Contains(cc, "immutable") {
		t.Errorf("want an immutable cache for a content-hashed asset, got %q", cc)
	}

	// The index must never be cached: it carries the runtime config and the
	// current bundle's script names.
	if cc := get(t, s, "/").Header.Get("Cache-Control"); cc != "no-store" {
		t.Errorf("want no-store on the index, got %q", cc)
	}

	// An unhashed file must not be pinned for a year in anybody's browser.
	if cc := get(t, s, "/mosaic-icon-dark.png").Header.Get("Cache-Control"); strings.Contains(cc, "immutable") {
		t.Errorf("an unhashed asset must not be immutable, got %q", cc)
	}
}

func TestHealthProbeReportsThisProcessOnly(t *testing.T) {
	s := newTestServer(t, Config{BootID: "boot-xyz"})

	resp := get(t, s, healthPath)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("want 200, got %d", resp.StatusCode)
	}

	var body struct {
		Status  string `json:"status"`
		Service string `json:"service"`
		BootID  string `json:"bootId"`
	}
	if err := json.Unmarshal([]byte(readBody(t, resp)), &body); err != nil {
		t.Fatalf("health body is not JSON: %v", err)
	}
	if body.Status != "ok" || body.Service != "mosaic-shell" {
		t.Errorf("unexpected health body: %+v", body)
	}
	// The boot id is what stitches this process's timeline to the
	// Supervisor's (ADR 0060), so the probe has to carry the adopted one.
	if body.BootID != "boot-xyz" {
		t.Errorf("want the adopted boot id, got %q", body.BootID)
	}
}

func TestWriteMethodsAreRefused(t *testing.T) {
	s := newTestServer(t, Config{})

	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/library", nil))

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("want 405, got %d", rec.Code)
	}
	if allow := rec.Header().Get("Allow"); allow != "GET, HEAD" {
		t.Errorf("want an Allow header, got %q", allow)
	}
}

// A traversal must not escape the bundle. fs.FS rejects the paths outright and
// path.Clean collapses the rest, but the property is worth pinning: this is the
// one place the process reads a caller-supplied name.
func TestTraversalCannotEscapeTheBundle(t *testing.T) {
	s := newTestServer(t, Config{})

	for _, target := range []string{"/../go.mod", "/assets/../../go.mod", "/%2e%2e/go.mod"} {
		resp := get(t, s, target)
		body := readBody(t, resp)
		if strings.Contains(body, "module github.com") {
			t.Errorf("%s: escaped the bundle", target)
		}
	}
}

func readBody(t *testing.T, resp *http.Response) string {
	t.Helper()
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("reading body: %v", err)
	}
	return string(body)
}

// extractRuntimeJSON pulls the injected object back out of the document.
func extractRuntimeJSON(t *testing.T, document string) string {
	t.Helper()
	const open = "window." + runtimeGlobal + "="
	start := strings.Index(document, open)
	if start == -1 {
		t.Fatalf("no runtime config in document:\n%s", document)
	}
	start += len(open)
	end := strings.Index(document[start:], ";</script>")
	if end == -1 {
		t.Fatalf("runtime config is not terminated:\n%s", document)
	}
	return document[start : start+end]
}
