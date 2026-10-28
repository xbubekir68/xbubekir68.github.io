#!/usr/bin/env bash
# Baut die offiziellen SDKs als je eine Browser-Datei nach vendor/ (kein CDN, strenge CSP möglich):
#   vendor/genai.js     – Google Gen AI SDK (Gemini)
#   vendor/anthropic.js – Anthropic SDK (Claude)
# Aufruf: bash tools/build-sdk.sh   (Versionen über GENAI_VER / ANTHROPIC_VER änderbar) – danach in sw.js die Version V hochzählen.
set -euo pipefail
GENAI_VER="${GENAI_VER:-2.31.0}"
ANTHROPIC_VER="${ANTHROPIC_VER:-1.3.0}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
npm init -y >/dev/null
npm install --silent "@google/genai@$GENAI_VER" "@anthropic-ai/sdk@$ANTHROPIC_VER" esbuild@0.25.11
echo 'export { GoogleGenAI, ApiError } from "@google/genai";' > genai.mjs
echo 'export { default } from "@anthropic-ai/sdk";' > anthropic.mjs
npx esbuild genai.mjs --bundle --format=esm --platform=browser --minify --legal-comments=eof \
  --banner:js="/*! @google/genai $GENAI_VER, Apache-2.0, https://github.com/googleapis/js-genai (gebündelt mit tools/build-sdk.sh) */" \
  --outfile="$DIR/vendor/genai.js"
npx esbuild anthropic.mjs --bundle --format=esm --platform=browser --minify --legal-comments=eof \
  --banner:js="/*! @anthropic-ai/sdk $ANTHROPIC_VER, Apache-2.0, https://github.com/anthropics/anthropic-sdk-typescript (gebündelt mit tools/build-sdk.sh) */" \
  --outfile="$DIR/vendor/anthropic.js"
cp node_modules/@google/genai/LICENSE "$DIR/vendor/LICENSE-google-genai.txt"
cp node_modules/@anthropic-ai/sdk/LICENSE "$DIR/vendor/LICENSE-anthropic-sdk.txt"
echo "vendor/: genai $GENAI_VER, anthropic $ANTHROPIC_VER"
