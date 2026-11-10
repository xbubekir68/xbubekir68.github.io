// xbubekir Server (Supabase Edge Function „mufradaat“, Projekt „xbubekir AI“): mufradaat.AI, powered by xbu.
// Der Übungspartner in Mufradaat schreibt mit DeepSeek über OpenRouter. Der Schlüssel ist derselbe wie bei „openrouter“
// (Secret OPENROUTER_API_KEY in diesem Projekt), er verlässt den Server nie.
//
// Zugang: angemeldete Mufradaat-Konten. Mufradaat hat ein eigenes Supabase-Projekt, deshalb prüft diese Funktion den
// Anmelde-Token dort (Auth-API von Mufradaat), nicht in diesem Projekt. Gäste ohne Konto haben keinen Zugang.
// Kosten: Modell, Länge, Anbieter und die Anweisung an die KI legt der Server fest. Die App schickt nur das Thema (Wörter)
// und das Gespräch. Pro Konto und Tag (Wiener Zeit) zählt public.mufradaat_ai_usage mit, dazu gibt es eine Obergrenze für alle zusammen.
// Bereitstellen: über das Supabase-MCP-Werkzeug deploy_edge_function (verify_jwt aus, die Prüfung macht der Code selbst).
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-v4.1-flash";
// wie bei „openrouter“: nur Anbieter, die nichts speichern, keine mit Sitz in China und keine stark verkleinerten Fassungen (fp4)
const PROVIDER = {
  data_collection: "deny",
  ignore: ["baidu", "streamlake", "alibaba", "siliconflow"],
  quantizations: ["fp8", "fp16", "bf16", "fp32", "unknown"],
};
const PER_USER_DAY = 60, ALL_DAY = 600; // Nachrichten pro Konto und Tag, für alle zusammen (DeepSeek V4.1 Flash: meist unter 0,1 Cent je Nachricht)
const MAX_TOKENS = 1500, MAX_MSGS = 24, MAX_MSG_CHARS = 1500, MAX_WORDS = 60;
const MFR_URL = "https://yvhfnatslxrkmqpivvxg.supabase.co", MFR_KEY = "sb_publishable_DVnUpObsQ2uIeqIk-12dcA_1AKPsWpu"; // öffentlich (steht auch in Mufradaat)
const CORS = {
  "Access-Control-Allow-Origin": "https://xbubekir68.github.io",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-ki-rest",
  "Vary": "Origin",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Fehler im Format von OpenRouter ({error:{code,message}}); reason sagt der App, welcher Hinweis passt
const fail = (code: number, reason: string, message: string) =>
  new Response(JSON.stringify({ error: { code, reason, message } }), {
    status: code, headers: { ...CORS, "content-type": "application/json" },
  });
const str = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

type Word = [string, string, string]; // Arabisch mit Harakat, Umschrift, Deutsch
// Die Anweisung an die KI. Antwortformat passt zur Anzeige in Mufradaat (kiParse): Arabisch / Umschrift / Deutsch / Rest auf Deutsch.
function system(t: string, g: string, w: Word[]) {
  return `Du bist xbubekir, der KI-Übungspartner in Mufradaat. Mufradaat ist eine App, mit der Deutschsprachige Hocharabisch (Fusha) lernen. Die Person ist Anfängerin oder Anfänger.

Thema: ${t} (${g}).
Wörter, die die Person schon kennt: ${w.map(([ar, tr, de]) => `${ar} (${tr}) = ${de}`).join("; ")}.

So übst du:
- Führe ein sehr einfaches Gespräch auf Hocharabisch (Fusha), nie im Dialekt.
- Nutze vor allem die Wörter oben, dazu nur ganz einfache Wörter wie هَذَا، مَا، مَنْ، نَعَمْ، لَا، وَ.
- Pro Antwort ein kurzer arabischer Satz, höchstens zwei.
- Arabisch schreibst du immer vollständig mit Harakat, auch mit den Endungen (z. B. هَذَا كِتَابٌ).
- Umschrift wie in der App: ā ī ū für lange Vokale, ʿ für ʿAyn, ʾ für Hamza, dazu kh, sh, th, dh, gh, ḥ, ṣ, ḍ, ṭ, ẓ.
- Die Person schreibt auf Arabisch (oft ohne Harakat), in Umschrift oder auf Deutsch. Du verstehst alles davon.
- Schreibt sie Arabisch oder Umschrift, prüfst du es. Stimmt es, lobst du kurz. Ist etwas falsch, nennst du freundlich die richtige Form mit Harakat und erklärst in einem Satz, warum.
- Fragt sie etwas auf Deutsch (z. B. „Was heißt …?“ oder „Frag mich ab.“), hilfst du direkt.
- Du duzt, bist herzlich und locker, ohne Floskeln wie „Gute Frage!“.
- Du bleibst beim Arabischlernen. Bei anderen Themen sagst du freundlich, dass du hier nur beim Üben hilfst.
- Du erfindest nichts. Bist du dir bei einem Wort oder einer Endung unsicher, sagst du das.

Antworte immer genau so:
Zeile 1: dein arabischer Satz mit allen Harakat, fett (**…**)
Zeile 2: die Umschrift, kursiv (*…*)
Zeile 3: die deutsche Bedeutung
Dann eine Leerzeile und danach auf Deutsch, höchstens drei kurze Sätze: Rückmeldung zur Nachricht der Person (wenn nötig) und eine kurze Frage oder Aufgabe, auf die sie auf Arabisch antworten kann.
Keine Überschriften, keine Listen, keine Tabellen.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return fail(405, "method", "Nur POST.");

  // Anmeldung bei Mufradaat prüfen (Token des Mufradaat-Projekts)
  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(auth)) return fail(401, "auth", "Für den Übungspartner brauchst du ein Mufradaat-Konto.");
  const who = await fetch(MFR_URL + "/auth/v1/user", { headers: { apikey: MFR_KEY, authorization: auth } }).catch(() => null);
  if (!who) return fail(503, "busy", "Die Anmeldung konnte gerade nicht geprüft werden.");
  if (!who.ok) return fail(401, "auth", "Nicht angemeldet. Bitte in Mufradaat neu anmelden.");
  const user = await who.json().catch(() => null) as { id?: string } | null;
  if (!user?.id) return fail(401, "auth", "Nicht angemeldet. Bitte in Mufradaat neu anmelden.");

  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return fail(503, "server", "Auf dem Server fehlt der OpenRouter-Schlüssel (Secret OPENROUTER_API_KEY).");

  // Anfrage prüfen: Thema mit Wörtern, Gespräch nur aus Nachrichten der Person und des Übungspartners, die letzte von der Person
  const raw = await req.text();
  if (raw.length > 60_000) return fail(413, "long", "Das Gespräch ist zu lang. Fang am besten ein neues an.");
  let body: { topic?: { t?: unknown; g?: unknown; w?: unknown }; messages?: { role?: unknown; content?: unknown }[] };
  try { body = JSON.parse(raw); } catch { return fail(400, "bad", "Ungültige Anfrage."); }
  const { topic, messages } = body ?? {};
  const words = topic?.w;
  if (!topic || !str(topic.t, 80) || !str(topic.g, 80) || !Array.isArray(words) || !words.length || words.length > MAX_WORDS ||
      !words.every((x) => Array.isArray(x) && x.length === 3 && x.every((s) => str(s, 80)))) {
    return fail(400, "bad", "Ungültiges Thema.");
  }
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MSGS ||
      !messages.every((m) => (m?.role === "user" || m?.role === "assistant") && str(m.content, MAX_MSG_CHARS)) ||
      messages[messages.length - 1].role !== "user") {
    return fail(400, "bad", "Ungültiges Gespräch.");
  }

  // Tageszähler: erst zählen, dann fragen; scheitert OpenRouter, zählt die Nachricht nicht
  const { data: n, error: cnt } = await admin.rpc("mufradaat_ai_take", { p_user: user.id, p_user_limit: PER_USER_DAY, p_all_limit: ALL_DAY });
  if (cnt) return fail(503, "server", "Der Zähler auf dem Server antwortet nicht.");
  if (n === -1) return fail(429, "limit", `Für heute sind deine ${PER_USER_DAY} Nachrichten aufgebraucht. Morgen geht es weiter.`);
  if (n === -2) return fail(429, "limit_all", "Der Übungspartner hat für heute Pause. Morgen geht es weiter.");
  const giveBack = () => admin.rpc("mufradaat_ai_give_back", { p_user: user.id }).then(() => {}, () => {});

  const res = await fetch(OPENROUTER, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${key}`, "content-type": "application/json",
      "HTTP-Referer": "https://xbubekir68.github.io/mufradaat/", "X-Title": "mufradaat.AI",
    },
    body: JSON.stringify({
      model: MODEL, stream: true, max_tokens: MAX_TOKENS, temperature: 0.6, provider: PROVIDER,
      reasoning: { effort: "low", exclude: true }, // kurz nachdenken, Gedanken nicht mitschicken
      messages: [{ role: "system", content: system(topic.t as string, topic.g as string, words as Word[]) },
        ...messages.map((m) => ({ role: m.role, content: m.content }))],
    }),
  }).catch(() => null);
  if (!res || !res.ok) {
    await giveBack();
    const s = res?.status ?? 0;
    console.error("openrouter", s, res ? (await res.text().catch(() => "")).slice(0, 300) : "keine Verbindung");
    // Schlüssel, Guthaben oder Anbieter: ein Problem des Servers, nicht der Person
    return fail(s === 429 ? 503 : 502, s === 402 ? "credit" : "busy", s === 402 ? "Das OpenRouter-Guthaben ist aufgebraucht." : "DeepSeek ist gerade nicht erreichbar.");
  }
  // Antwort (Streaming) unverändert durchreichen, dazu die übrigen Nachrichten für heute
  return new Response(res.body, {
    status: 200,
    headers: { ...CORS, "content-type": res.headers.get("content-type") ?? "text/event-stream", "x-ki-rest": String(Math.max(0, PER_USER_DAY - (n as number))) },
  });
});
