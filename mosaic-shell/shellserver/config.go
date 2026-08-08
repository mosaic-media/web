// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

// Package shellserver serves the built Shell bundle.
//
// It renders nothing and decides nothing. The Platform owns every screen
// (ADR 0031) and this process owns only the bytes of the client that draws
// them: static assets, a deep-link fallback so a refresh on /library is not a
// 404, one runtime configuration injection, and a health probe the Supervisor
// can read (ADR 0060). There is no server-side rendering and no proxying —
// adding either would make this a second place a screen could come from.
package shellserver

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

// Environment variable names. They are read in one place so the whole
// configuration surface of this binary is four lines long and greppable.
const (
	addrEnv        = "MOSAIC_SHELL_ADDR"
	platformURLEnv = "MOSAIC_SHELL_PLATFORM_URL"
	bootIDEnv      = "MOSAIC_BOOT_ID"
)

// defaultAddr is deliberately not 5173, 8080, 8081 or 8082: those belong to
// the Vite dev server, the Supervisor handoff, the Platform's client API and
// the dev registry respectively, and a default that collides with one of them
// turns "the Shell did not come up" into a port hunt.
const defaultAddr = ":8090"

// Config is the whole of what an operator can set. Every field is settable at
// *runtime*, which is the point of this binary existing: the Shell used to
// read its Platform endpoint from `import.meta.env.VITE_PLATFORM_URL`, baked
// in when the bundle was built, so pointing a built artefact at a different
// Platform meant rebuilding it. One artefact must serve every install.
type Config struct {
	// Addr is the listen address.
	Addr string
	// PlatformURL is the origin the Shell opens its Connect transport
	// against. Empty means same-origin, which is what a deployment behind
	// the Supervisor's single front door wants (ADR 0005): the Shell at the
	// root and the Platform's services behind the same TLS endpoint.
	PlatformURL string
	// BootID names one start of this process, adopted from a supervising
	// process when it supplied one and minted otherwise (ADR 0060).
	BootID string
}

// LoadConfig reads the configuration from the environment.
//
// It validates rather than coerces: a PlatformURL that is not an absolute
// http(s) origin is an error at startup, not a client that fails its first
// call with a message pointing at the wrong layer.
func LoadConfig(getenv func(string) string) (Config, error) {
	cfg := Config{
		Addr:        strings.TrimSpace(getenv(addrEnv)),
		PlatformURL: strings.TrimSpace(getenv(platformURLEnv)),
		BootID:      strings.TrimSpace(getenv(bootIDEnv)),
	}
	if cfg.Addr == "" {
		cfg.Addr = defaultAddr
	}
	if cfg.BootID == "" {
		cfg.BootID = newID()
	}
	if cfg.PlatformURL != "" {
		if err := validateOrigin(cfg.PlatformURL); err != nil {
			return Config{}, fmt.Errorf("%s: %w", platformURLEnv, err)
		}
		cfg.PlatformURL = strings.TrimRight(cfg.PlatformURL, "/")
	}
	return cfg, nil
}

// LoadConfigFromEnv is LoadConfig against the process environment.
func LoadConfigFromEnv() (Config, error) { return LoadConfig(os.Getenv) }

// validateOrigin refuses anything that is not an absolute http(s) URL. A
// relative value would be injected into the page and silently resolve against
// whatever origin served it, which is the same same-origin behaviour the empty
// string already means — so accepting it would give two spellings for one
// thing and hide a typo as a working default.
func validateOrigin(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("not a URL: %w", err)
	}
	switch parsed.Scheme {
	case "http", "https":
	default:
		return fmt.Errorf("must be an http:// or https:// URL, got %q", raw)
	}
	if parsed.Host == "" {
		return fmt.Errorf("must include a host, got %q", raw)
	}
	return nil
}
