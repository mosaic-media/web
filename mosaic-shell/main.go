// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 the Mosaic authors

// Command mosaic-shell serves the built Mosaic Shell.
//
// The Shell was a Vite bundle with no server of its own, which left two things
// unresolved that this binary exists to settle: the Platform endpoint was baked
// into the bundle at build time, so one artefact could not serve two installs;
// and there was no process for a Supervisor to start, probe or hand a boot id
// to (ADR 0060). It renders nothing and decides nothing — the Platform owns
// every screen (ADR 0031).
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mosaic-media/web/mosaic-shell/shellserver"
)

func main() {
	if err := run(); err != nil {
		log.Printf("mosaic-shell: %v", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := shellserver.LoadConfigFromEnv()
	if err != nil {
		return err
	}

	assets, err := shellAssets()
	if err != nil {
		return fmt.Errorf("opening the asset bundle: %w", err)
	}

	handler, err := shellserver.New(assets, cfg)
	if err != nil {
		return err
	}

	server := &http.Server{
		Addr:    cfg.Addr,
		Handler: handler,
		// A client that opens a connection and never sends a request must not
		// be able to hold one open indefinitely. These are generous: the Shell
		// serves static files to browsers, so nothing legitimate here is slow.
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	target := cfg.PlatformURL
	if target == "" {
		target = "same origin"
	}
	log.Printf("mosaic-shell %s listening on %s (platform: %s, boot: %s)",
		shellserver.Version(), cfg.Addr, target, cfg.BootID)

	// Shut down on a signal rather than dying mid-response. The Supervisor
	// stops this process to activate a Generation, and a client that loses a
	// response during a planned handover reads as a crash to the person using
	// it (ADR 0033).
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errs := make(chan error, 1)
	go func() {
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errs <- err
			return
		}
		errs <- nil
	}()

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
		log.Printf("mosaic-shell: shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return server.Shutdown(shutdownCtx)
	}
}
