// Selbsttest für index.ts ohne Netz und ohne Deno: node xbubekir/server/openrouter/test.mjs (Node 24)
// Lädt die echte Function, ersetzt nur Supabase, Deno und fetch durch Attrappen und prüft, was durchgeht und was abgelehnt wird.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

let handler, sent;
globalThis.Deno = { env: { get: (k) => "x-" + k }, serve: (f) => { handler = f; } };
globalThis.__createClient = () => ({
  auth: { getUser: async (jwt) => jwt === "ok" ? { data: { user: { id: "u1" } } } : { data: {}, error: new Error("nein") } },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: "u1" } }) }) }) }),
});
globalThis.fetch = async (_url, init) => { sent = JSON.parse(init.body); return new Response("data: [DONE]\n\n", { status: 200 }); };

const src = readFileSync(new URL("index.ts", import.meta.url), "utf8")
  .replace(/^import \{ createClient \} from .*$/m, "const createClient = globalThis.__createClient;");
await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(src)).toString("base64"));

const FLASH = "deepseek/deepseek-v4.1-flash", PRO = "deepseek/deepseek-v4-pro";
const pic = { type: "image_url", image_url: { url: "data:image/jpeg;base64,/9j/4AAQ" } }, txt = (t) => ({ type: "text", text: t });
const ask = async (model, messages, jwt = "ok", extra = {}) => {
  sent = null;
  const res = await handler(new Request("https://x/functions/v1/openrouter", {
    method: "POST", headers: { authorization: "Bearer " + jwt }, body: JSON.stringify({ model, effort: "low", messages, ...extra }),
  }));
  return res.status;
};

assert.equal(await ask(FLASH, [{ role: "user", content: "Hallo" }], "falsch"), 401, "ohne Anmeldung kein Zugang");
assert.equal(await ask(FLASH, [{ role: "system", content: "s" }, { role: "user", content: "Hallo" }]), 200, "reiner Text geht wie bisher");
assert.equal(await ask(FLASH, [{ role: "user", content: [txt("Was ist das?"), pic] }]), 200, "Text und Bild");
assert.deepEqual(sent.messages[0].content[1], pic, "das Bild geht unverändert an OpenRouter");
assert.equal(await ask(FLASH, [{ role: "user", content: [pic] }]), 200, "nur ein Bild");
assert.equal(await ask(PRO, [{ role: "user", content: [txt("a"), pic] }]), 400, "V4 Pro kann keine Bilder sehen");
assert.equal(sent, null, "Abgelehntes geht nicht an OpenRouter");
assert.equal(await ask(FLASH, [{ role: "user", content: [{ type: "image_url", image_url: { url: "https://fremd.example/bild.jpg" } }] }]), 400, "keine fremden Adressen");
assert.equal(await ask(FLASH, [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:text/html;base64,PGI+" } }] }]), 400, "nur Bildformate");
assert.equal(await ask(FLASH, [{ role: "user", content: [{ type: "file", file: {} }] }]), 400, "keine anderen Anhänge");
assert.equal(await ask(FLASH, [{ role: "user", content: [] }]), 400, "leere Liste");
assert.equal(await ask(FLASH, [{ role: "user", content: "a" }, { role: "assistant", content: [pic] }]), 400, "Bilder nur in Nachrichten der Person");
assert.equal(await ask(FLASH, [{ role: "user", content: Array(12).fill(pic) }]), 200, "12 Bilder sind die Grenze");
assert.equal(await ask(FLASH, [{ role: "user", content: Array(13).fill(pic) }]), 413, "13 Bilder sind zu viel");
assert.equal(await ask(FLASH, [{ role: "user", content: [txt("x".repeat(400_001)), pic] }]), 413, "Textgrenze gilt auch neben Bildern");
assert.equal(await ask(FLASH, [{ role: "user", content: "x".repeat(400_001) }]), 413, "Textgrenze wie bisher");
await ask(FLASH, [{ role: "user", content: "Hallo" }]);
assert.equal(sent.tools, undefined, "ohne Wunsch keine Websuche");
assert.equal(await ask(FLASH, [{ role: "user", content: "Wetter?" }], "ok", { web: true }), 200, "mit Websuche");
assert.deepEqual(sent.tools?.map((t) => t.type), ["openrouter:web_search"], "Websuche als OpenRouter-Werkzeug");
assert.equal(sent.tools[0].parameters.max_uses, 3, "höchstens 3 Suchen pro Antwort");
await ask(FLASH, [{ role: "user", content: "a" }], "ok", { web: "ja", tools: [{ type: "openrouter:image_generation" }] });
assert.equal(sent.tools, undefined, "nur web: true schaltet sie ein, eigene Werkzeuge der App gehen nicht durch");
console.log("openrouter: alle Prüfungen bestanden");
