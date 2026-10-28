#!/usr/bin/env bash
# Baut vendor/anthropic.js: das offizielle Anthropic-SDK als eine Browser-Datei (kein CDN, strenge CSP möglich).
# Aufruf: bash tools/build-sdk.sh [version]   – danach in sw.js die Version V hochzählen.
set -euo pipefail
VER="${1:-1.3.0}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
npm init -y >/dev/null
npm install --silent "@anthropic-ai/sdk@$VER" esbuild@0.25.11
echo 'export { default } from "@anthropic-ai/sdk";' > entry.mjs
npx esbuild entry.mjs --bundle --format=esm --platform=browser --minify --legal-comments=eof \
  --banner:js="/*! @anthropic-ai/sdk $VER, Apache-2.0, https://github.com/anthropics/anthropic-sdk-typescript (gebündelt mit tools/build-sdk.sh) */" \
  --outfile="$DIR/vendor/anthropic.js"
cp node_modules/@anthropic-ai/sdk/LICENSE "$DIR/vendor/LICENSE-anthropic-sdk.txt"
echo "vendor/anthropic.js: SDK $VER"
