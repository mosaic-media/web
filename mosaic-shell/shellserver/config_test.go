// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

package shellserver

import "testing"

// env builds a getenv function over a map, so a test states the whole
// environment it means rather than mutating the process's.
func env(pairs map[string]string) func(string) string {
	return func(key string) string { return pairs[key] }
}

func TestDefaultsAreUsable(t *testing.T) {
	cfg, err := LoadConfig(env(nil))
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}
	if cfg.Addr != defaultAddr {
		t.Errorf("want %q, got %q", defaultAddr, cfg.Addr)
	}
	// Same-origin, which is the deployed shape behind the Supervisor.
	if cfg.PlatformURL != "" {
		t.Errorf("want same-origin by default, got %q", cfg.PlatformURL)
	}
	// A boot is always nameable in the logs, even unsupervised.
	if cfg.BootID == "" {
		t.Error("want a minted boot id when none was supplied")
	}
}

// ADR 0060: adopt an inbound id rather than always minting, so the
// Supervisor's records and this process's stitch into one timeline.
func TestAnInboundBootIDIsAdopted(t *testing.T) {
	cfg, err := LoadConfig(env(map[string]string{bootIDEnv: "from-supervisor"}))
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}
	if cfg.BootID != "from-supervisor" {
		t.Errorf("want the inbound boot id, got %q", cfg.BootID)
	}
}

func TestTwoBootsAreDistinguishable(t *testing.T) {
	first, _ := LoadConfig(env(nil))
	second, _ := LoadConfig(env(nil))
	if first.BootID == second.BootID {
		t.Errorf("two minted boot ids collided: %q", first.BootID)
	}
}

func TestPlatformURLIsValidatedAtStartup(t *testing.T) {
	for _, raw := range []string{
		"mosaic.example",       // no scheme — would resolve against the page
		"/api",                 // relative — a second spelling of same-origin
		"ftp://mosaic.example", // not a browser-reachable scheme
		"https://",             // no host
	} {
		if _, err := LoadConfig(env(map[string]string{platformURLEnv: raw})); err == nil {
			t.Errorf("%q was accepted; a bad endpoint must fail at startup, not on the client's first call", raw)
		}
	}
}

func TestPlatformURLTrailingSlashIsTrimmed(t *testing.T) {
	cfg, err := LoadConfig(env(map[string]string{platformURLEnv: "https://mosaic.example/"}))
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}
	// Connect builds paths onto this; a trailing slash yields "//service".
	if cfg.PlatformURL != "https://mosaic.example" {
		t.Errorf("want the trailing slash trimmed, got %q", cfg.PlatformURL)
	}
}

func TestWhitespaceIsTrimmed(t *testing.T) {
	cfg, err := LoadConfig(env(map[string]string{
		addrEnv:        "  :9000  ",
		platformURLEnv: "  https://mosaic.example  ",
	}))
	if err != nil {
		t.Fatalf("LoadConfig: %v", err)
	}
	if cfg.Addr != ":9000" || cfg.PlatformURL != "https://mosaic.example" {
		t.Errorf("whitespace survived: %+v", cfg)
	}
}
