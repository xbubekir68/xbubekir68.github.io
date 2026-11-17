// xbubekir Server (Supabase Edge Function „openrouter“, Projekt „xbubekir“ – getrennt von Mufradaat):
// leitet Chat-Anfragen an OpenRouter weiter, damit xbubekir mit Open-Source-Modellen wie DeepSeek denkt.
// Der OpenRouter-Schlüssel liegt nur hier als Secret OPENROUTER_API_KEY (Ausgabenlimit am Schlüssel auf openrouter.ai setzen).
// Zugang nur für angemeldete Nutzer, die in public.allowed_users stehen (wie bei „gemini“).
// Modell, Länge und erlaubte Anbieter legt der Server fest, nicht die App.
// Bereitstellen: über das Supabase-MCP-Werkzeug deploy_edge_function (verify_jwt aus, die Prüfung macht der Code selbst).
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = new Set(["deepseek/deepseek-v4.1-flash", "deepseek/deepseek-v4-pro"]);
const VISION = new Set(["deepseek/deepseek-v4.1-flash"]); // nur dieses Modell kann Bilder sehen
// Bilder nur als mitgeschickte Daten, nie als Adresse: Sonst würde der Anbieter fremde Adressen abrufen
const PIC = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const EFFORT = new Set(["low", "medium", "high"]);
// Nur Anbieter, die nichts speichern, keine mit Sitz in China und keine stark verkleinerten Fassungen (fp4)
const PROVIDER = {
  data_collection: "deny",
  ignore: ["baidu", "streamlake", "alibaba", "siliconflow"],
  quantizations: ["fp8", "fp16", "bf16", "fp32", "unknown"],
};
// Websuche (OpenRouter-Werkzeug): die App sagt nur ja oder nein, Suchmaschine und Grenzen legt der Server fest.
// Parallel „basic“: etwa 0,5 Cent pro Suche, höchstens 3 Suchen pro Antwort.
const WEB = { type: "openrouter:web_search", parameters: { engine: "parallel", max_results: 5, max_uses: 3, max_total_results: 15 } };
const MAX_TOKENS = 12000, MAX_CHARS = 400_000; // begrenzt die Kosten pro Nachricht (Antwort inkl. Nachdenken, Verlauf)
const MAX_PICS = 12, MAX_RAW = 6_000_000; // Bilder im ganzen Verlauf und Größe der Anfrage (die App verkleinert Bilder auf rund 0,3 MB)
const CORS = {
  "Access-Control-Allow-Origin": "https://xbubekir68.github.io",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "7200", // Browser fragt nicht vor jeder Anfrage neu nach (Chrome höchstens 2 h, Safari 10 min)
  "Vary": "Origin",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Geprüfte Anmeldungen kurz merken: Ein Token gilt bis zu 5 Minuten (nie über sein Ablaufdatum hinaus) ohne neue Prüfung.
// Spart pro Anfrage zwei Abfragen (Anmeldung, Freischaltung); im Sprachmodus kommt pro Satz eine Anfrage.
// Wird ein Konto gesperrt oder abgemeldet, wirkt das deshalb erst nach höchstens 5 Minuten.
const okUntil = new Map<string, number>();
async function denied(jwt: string): Promise<0 | 401 | 403> {
  if ((okUntil.get(jwt) ?? 0) > Date.now()) return 0;
  const { data: who, error } = await admin.auth.getUser(jwt);
  if (error || !who.user) return 401;
  const { data: ok } = await admin.from("allowed_users").select("user_id").eq("user_id", who.user.id).maybeSingle();
  if (!ok) return 403;
  let exp = 0;
  try { exp = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000; } catch { /* ohne Ablaufdatum nicht merken */ }
  if (okUntil.size > 200) okUntil.clear();
  if (exp > Date.now()) okUntil.set(jwt, Math.min(Date.now() + 300_000, exp));
  return 0;
}

// Fehler im Format von OpenRouter ({error:{code,message}}), damit die App alle Fehler gleich behandelt
const fail = (code: number, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status: code, headers: { ...CORS, "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return fail(405, "Nur POST.");

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const no = await denied(jwt);
  if (no === 401) return fail(401, "Nicht angemeldet. Bitte in xbubekir neu anmelden.");
  if (no === 403) return fail(403, "Dieses Konto ist für xbubekir nicht freigeschaltet.");

  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return fail(500, "Auf dem Server fehlt noch der OpenRouter-Schlüssel (Secret OPENROUTER_API_KEY).");

  const raw = await req.text();
  if (raw.length > MAX_RAW) return fail(413, "Der Chat ist zu lang. Fang am besten einen neuen an.");
  let body: { model?: string; effort?: string; web?: unknown; messages?: { role?: string; content?: unknown }[] };
  try { body = JSON.parse(raw); } catch { return fail(400, "Ungültige Anfrage."); }
  const { model, effort, web, messages } = body ?? {};
  if (!model || !MODELS.has(model)) return fail(400, "Dieses Modell ist nicht erlaubt.");
  // Inhalt ist Text oder, nur bei Nachrichten der Person, eine Liste aus Text und Bildern
  let chars = 0, pics = 0;
  // deno-lint-ignore no-explicit-any
  const part = (p: any) => {
    if (p?.type === "text" && typeof p.text === "string") { chars += p.text.length; return true; }
    if (p?.type === "image_url" && typeof p.image_url?.url === "string" && PIC.test(p.image_url.url)) { pics++; return true; }
    return false;
  };
  const valid = (m: { role?: string; content?: unknown }) => {
    if (!["system", "user", "assistant"].includes(m?.role ?? "")) return false;
    if (typeof m.content === "string") { chars += m.content.length; return true; }
    return m.role === "user" && Array.isArray(m.content) && m.content.length > 0 && m.content.every(part);
  };
  if (!Array.isArray(messages) || !messages.length || messages.length > 400 || !messages.every(valid)) {
    return fail(400, "Ungültiger Verlauf.");
  }
  if (chars > MAX_CHARS || pics > MAX_PICS) return fail(413, "Der Chat ist zu lang. Fang am besten einen neuen an.");
  if (pics && !VISION.has(model)) return fail(400, "Dieses Modell kann keine Bilder sehen.");

  const res = await fetch(OPENROUTER, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${key}`, "content-type": "application/json",
      "HTTP-Referer": "https://xbubekir68.github.io/xbubekir/", "X-Title": "xbubekir",
    },
    body: JSON.stringify({
      model, messages, stream: true, max_tokens: MAX_TOKENS, provider: PROVIDER,
      reasoning: { effort: EFFORT.has(effort ?? "") ? effort : "low" },
      ...(web === true ? { tools: [WEB] } : {}),
    }),
  });
  // Ein abgelehnter Schlüssel ist ein Serverproblem, kein Anmeldeproblem der App
  if (res.status === 401) return fail(502, "Der OpenRouter-Schlüssel auf dem Server wurde abgelehnt (Secret OPENROUTER_API_KEY prüfen).");
  // Antwort (Streaming) unverändert durchreichen
  return new Response(res.body, {
    status: res.status,
    headers: { ...CORS, "content-type": res.headers.get("content-type") ?? "application/json" },
  });
});
