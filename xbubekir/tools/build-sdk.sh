#!/usr/bin/env bash
# Baut die offiziellen SDKs als je eine Browser-Datei nach vendor/ (kein CDN, strenge CSP möglich):
#   vendor/genai.js     – Google Gen AI SDK (Gemini)
#   vendor/supabase.js  – Supabase-Client (Anmeldung am eigenen xbubekir-Server)
# Aufruf: bash tools/build-sdk.sh   (Versionen über GENAI_VER / SUPABASE_VER änderbar) – danach in sw.js die Version V hochzählen.
set -euo pipefail
GENAI_VER="${GENAI_VER:-2.31.0}"
SUPABASE_VER="${SUPABASE_VER:-2.118.0}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
npm init -y >/dev/null
npm install --silent "@google/genai@$GENAI_VER" "@supabase/supabase-js@$SUPABASE_VER" esbuild@0.25.11
echo 'export { GoogleGenAI, ApiError } from "@google/genai";' > genai.mjs
echo 'export { createClient } from "@supabase/supabase-js";' > supabase.mjs
npx esbuild genai.mjs --bundle --format=esm --platform=browser --minify --legal-comments=eof \
  --banner:js="/*! @google/genai $GENAI_VER, Apache-2.0, https://github.com/googleapis/js-genai (gebündelt mit tools/build-sdk.sh) */" \
  --outfile="$DIR/vendor/genai.js"
npx esbuild supabase.mjs --bundle --format=esm --platform=browser --minify --legal-comments=eof \
  --banner:js="/*! @supabase/supabase-js $SUPABASE_VER, MIT, https://github.com/supabase/supabase-js (gebündelt mit tools/build-sdk.sh) */" \
  --outfile="$DIR/vendor/supabase.js"
cp node_modules/@google/genai/LICENSE "$DIR/vendor/LICENSE-google-genai.txt"
cp node_modules/@supabase/supabase-js/LICENSE "$DIR/vendor/LICENSE-supabase-js.txt"
echo "vendor/: genai $GENAI_VER, supabase $SUPABASE_VER"
