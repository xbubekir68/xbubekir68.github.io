// Selbsttest für index.ts ohne Netz und ohne Deno: node xbubekir/server/gemini/test.mjs (Node 24)
// Lädt die echte Function, ersetzt nur Supabase, Deno und fetch durch Attrappen und prüft, was durchgeht und was abgelehnt wird.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

let handler, sent, checks = 0;
globalThis.Deno = { env: { get: (k) => "x-" + k }, serve: (f) => { handler = f; } };
globalThis.__createClient = () => ({
  auth: { getUser: async (jwt) => (checks++, jwt === "ok" || jwt.startsWith("h.") ? { data: { user: { id: "u1" } } } : { data: {}, error: new Error("nein") }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: "u1" } }) }) }) }),
});
globalThis.fetch = async (url) => { sent = url; return new Response("{}", { status: 200, headers: { "content-type": "application/json" } }); };

const src = readFileSync(new URL("index.ts", import.meta.url), "utf8")
  .replace(/^import \{ createClient \} from .*$/m, "const createClient = globalThis.__createClient;");
await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(src)).toString("base64"));

const ask = async (path, jwt = "ok") => {
  sent = null;
  const res = await handler(new Request("https://x/functions/v1/gemini" + path, { method: "POST", headers: { authorization: "Bearer " + jwt }, body: "{}" }));
  return res.status;
};
const TTS = "/v1beta/models/gemini-3.8-flash-lite-tts:generateContent";

assert.equal(await ask(TTS, "falsch"), 401, "ohne Anmeldung kein Zugang");
assert.equal(sent, null, "Abgelehntes geht nicht an Google");
assert.equal(await ask(TTS), 200, "Stimme (TTS) ist erlaubt");
assert.equal(sent, "https://generativelanguage.googleapis.com" + TTS, "geht unverändert an Google");
assert.equal(await ask("/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse"), 200, "Chat wie bisher");
assert.ok(sent.endsWith("?alt=sse"), "Streaming bleibt Streaming");
assert.equal(await ask("/v1beta/models/gemini-3.8-pro:generateContent"), 404, "andere Modelle nicht");
assert.equal(await ask("/v1beta/models/gemini-3.8-flash-lite-tts:countTokens"), 404, "andere Aufrufe nicht");

const tok = (s) => "h." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + s })).toString("base64url") + ".sig";
const twice = async (jwt) => { checks = 0; await ask(TTS, jwt); await ask(TTS, jwt); return checks; };
assert.equal(await twice(tok(3600)), 1, "zweite Anfrage mit demselben Token ohne neue Prüfung");
assert.equal(await twice(tok(-10)), 2, "abgelaufenes Token wird nicht gemerkt");
assert.equal(await twice("ok"), 2, "Token ohne Ablaufdatum wird nicht gemerkt");
assert.equal(await twice("falsch"), 2, "Abgelehntes wird nicht gemerkt");

const pre = await handler(new Request("https://x/functions/v1/gemini" + TTS, { method: "OPTIONS" }));
assert.equal(pre.status, 200, "Vorabfrage beantwortet");
assert.equal(pre.headers.get("access-control-max-age"), "7200", "Browser darf die Vorabfrage zwischenspeichern");
console.log("gemini: alle Prüfungen bestanden");
