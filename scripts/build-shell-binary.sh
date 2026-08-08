#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-only
# SPDX-FileCopyrightText: 2026 the Mosaic authors
#
# Stage the built Shell into the Go module and link `mosaic-shell`.
#
# It does NOT build the bundle. The two toolchains live in two services —
# `test` has Node and no Go, `shell-binary` has Go and no Node — so the bundle
# is produced by the one that can, and this script runs in the other:
#
#   docker compose -f docker-compose.test.yml run --rm test \
#     npm run build --workspace packages/shell
#   docker compose -f docker-compose.test.yml run --rm shell-binary \
#     bash ../scripts/build-shell-binary.sh
#
# The staging copy is what makes `go:embed` possible at all: embed patterns are
# relative to the package directory and cannot climb out of it, so the bundle
# has to come *to* the module rather than the module reaching up for it.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dist="$root/packages/shell/dist"
staged="$root/mosaic-shell/webassets"
out="${1:-$root/mosaic-shell/mosaic-shell}"

if [ ! -f "$dist/index.html" ]; then
  echo "no $dist/index.html — build the bundle first:" >&2
  echo "  docker compose -f docker-compose.test.yml run --rm test npm run build --workspace packages/shell" >&2
  exit 1
fi

echo "--- staging the bundle into $staged ---"
# Everything except the tracked placeholder, which must survive: it is what
# keeps the directory present in a fresh clone so the Go module compiles
# before anybody has run a JavaScript build.
find "$staged" -mindepth 1 ! -name '.gitkeep' -delete
cp -R "$dist/." "$staged/"

echo "--- linking $out ---"
cd "$root/mosaic-shell"
go build -o "$out" .

echo "built $out"
