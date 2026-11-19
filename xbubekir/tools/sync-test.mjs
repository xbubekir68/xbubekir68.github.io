// Selbsttest für den Abgleich der Chats zwischen Geräten, ohne Netz: node xbubekir/tools/sync-test.mjs (Node 24)
// Lädt den echten Abschnitt aus app.js zweimal (zwei Geräte) gegen einen Server-Ersatz, der sich wie public.chats verhält
// (RLS ist hier egal, der Trigger aus server/chats.sql schon: ältere Fassungen überschreiben keine neueren).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const part = (a, b) => { const i = app.indexOf(a), j = app.indexOf(b, i); assert(i >= 0 && j > i, "Abschnitt fehlt: " + a); return app.slice(i, j + b.length); };
const src = part("function store(c){", "DB.del(c.id);mark(c.id,Date.now())}") + "\n" + part("// ---------- Abgleich", 'return was?"cur":true;\n}');

// Server-Ersatz: Zeilen je id, synced_at aus einer Uhr, die bei jedem Schreiben weiterläuft
const rows = new Map(); let tick = Date.parse("2026-11-19T12:00:00Z");
const write = (r) => { const o = rows.get(r.id); if (o && r.updated < o.updated) return; rows.set(r.id, structuredClone({ ...o, ...r, synced_at: new Date(tick += 1000).toISOString() })); };
function table() {
  let f = [], lim = Infinity, act = null;
  const q = {
    eq: (k, v) => (f.push((r) => r[k] === v), q), lt: (k, v) => (f.push((r) => r[k] < v), q),
    gte: (k, v) => (f.push((r) => Date.parse(r[k]) >= Date.parse(v)), q), order: () => q, limit: (n) => (lim = n, q),
    select: () => (act = "select", q), update: (d) => (act = { d }, q),
    upsert: async (list) => (list.forEach((r) => write({ ...r, data: r.data && JSON.parse(JSON.stringify(r.data)) })), { error: null }),
    then(res) {
      const hit = [...rows.values()].filter((r) => f.every((g) => g(r))).sort((a, b) => a.synced_at.localeCompare(b.synced_at));
      if (act === "select") return res({ data: structuredClone(hit.slice(0, lim)), error: null });
      hit.forEach((r) => write({ ...r, ...act.d })); res({ error: null });
    },
  };
  return q;
}

const T = { t: 1e12 };
function device() {
  const store = {}; // beide Geräte gehen gleich (eine gemeinsame Uhr); Gerätezeit, die nachgeht, verliert bei Konflikten
  class D extends Date { static now() { return T.t += 10; } }
  const env = {
    Date: D, tick: (ms) => { T.t += ms; }, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
    navigator: { onLine: true }, setTimeout: () => 0, clearTimeout: () => {}, console,
    DB: { put() {}, del() {} }, db: async () => ({ from: table }), auth: async () => ({}),
  };
  const make = new Function(...Object.keys(env), `
    let chats=[],cur=null,busy=false,recovery=false,session={user:{id:"u1"}},renders=0;
    const render=()=>renders++,renderList=()=>{};
    ${src}
    syncReady=true;
    return {get chats(){return chats},get cur(){return cur},set cur(c){cur=c},store,forget,
      async sync(){sync();while(syncing)await syncing},
      add(title){const c={id:title,title,created:Date.now(),msgs:[{role:"user",content:title}]};chats.unshift(c);store(c);return c},
      tick,wipe(){Y.wipe=Date.now();Y.dirty={};chats=[];cur=null;saveY()}};`);
  return make(...Object.values(env));
}
const titles = (d) => d.chats.map((c) => c.title).sort().join(",");

const A = device(), B = device();
A.add("eins"); A.add("zwei");
await A.sync();
assert.equal(rows.size, 2, "erster Abgleich lädt die Chats des Geräts hoch");
await B.sync();
assert.equal(titles(B), "eins,zwei", "anderes Gerät bekommt alle Chats");

const offen = A.chats.find((c) => c.id === "eins"); A.cur = offen;
const b1 = B.chats.find((c) => c.id === "eins"); b1.msgs.push({ role: "assistant", content: "von B" }); B.store(b1);
await B.sync(); await A.sync();
assert.equal(A.cur, offen, "offener Chat bleibt dasselbe Objekt");
assert.equal(offen.msgs.at(-1).content, "von B", "Änderung von B kommt bei A an");

A.forget(A.chats.find((c) => c.id === "zwei"));
await A.sync(); await B.sync();
assert.equal(titles(B), "eins", "Löschen kommt auf dem anderen Gerät an");

// Konflikt: beide ändern denselben Chat offline, B später. Egal wer zuerst abgleicht, am Ende gilt B.
const a = A.chats[0], b = B.chats[0];
a.title = "A-Fassung"; A.store(a);
B.tick(1000); b.title = "B-Fassung"; B.store(b); // B sicher später
await A.sync(); await B.sync(); await A.sync();
assert.equal(A.chats[0].title, "B-Fassung"); assert.equal(B.chats[0].title, "B-Fassung");
assert.equal(rows.get("eins").data.title, "B-Fassung", "Server behält die neuere Fassung");

A.add("drei"); await A.sync(); await B.sync();
assert.equal(titles(B), "B-Fassung,drei");
B.wipe(); await B.sync(); await A.sync();
assert.equal(A.chats.length, 0, "„Alle Chats löschen“ mit Konto löscht auch auf den anderen Geräten");
assert([...rows.values()].every((r) => r.deleted && r.data === null), "auf dem Server bleibt kein Inhalt");

console.log("Abgleich: alle Prüfungen bestanden");
