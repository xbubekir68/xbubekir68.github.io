// xbubekir Server (Supabase Edge Function „openrouter“, Projekt „xbubekir“ – getrennt von Mufradaat):
// leitet Chat-Anfragen an OpenRouter weiter, damit xbubekir mit Open-Source-Modellen wie DeepSeek denkt.
// Der OpenRouter-Schlüssel liegt nur hier als Secret OPENROUTER_API_KEY (Ausgabenlimit am Schlüssel auf openrouter.ai setzen).
// Zugang nur für angemeldete Nutzer, die in public.allowed_users stehen (wie bei „gemini“).
// Modell, Länge und erlaubte Anbieter legt der Server fest, nicht die App.
// Bereitstellen: über das Supabase-MCP-Werkzeug deploy_edge_function (verify_jwt aus, die Prüfung macht der Code selbst).
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = new Set(["deepseek/deepseek-v4.1-flash", "deepseek/deepseek-v4-pro"]);
const EFFORT = new Set(["low", "medium", "high"]);
// Nur Anbieter, die nichts speichern, keine mit Sitz in China und keine stark verkleinerten Fassungen (fp4)
const PROVIDER = {
  data_collection: "deny",
  ignore: ["baidu", "streamlake", "alibaba", "siliconflow"],
  quantizations: ["fp8", "fp16", "bf16", "fp32", "unknown"],
};
const MAX_TOKENS = 12000, MAX_CHARS = 400_000; // begrenzt die Kosten pro Nachricht (Antwort inkl. Nachdenken, Verlauf)
const CORS = {
  "Access-Control-Allow-Origin": "https://xbubekir68.github.io",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Fehler im Format von OpenRouter ({error:{code,message}}), damit die App alle Fehler gleich behandelt
const fail = (code: number, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status: code, headers: { ...CORS, "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return fail(405, "Nur POST.");

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who, error } = await admin.auth.getUser(jwt);
  if (error || !who.user) return fail(401, "Nicht angemeldet. Bitte in xbubekir neu anmelden.");
  const { data: ok } = await admin.from("allowed_users").select("user_id").eq("user_id", who.user.id).maybeSingle();
  if (!ok) return fail(403, "Dieses Konto ist für xbubekir nicht freigeschaltet.");

  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return fail(500, "Auf dem Server fehlt noch der OpenRouter-Schlüssel (Secret OPENROUTER_API_KEY).");

  const raw = await req.text();
  if (raw.length > MAX_CHARS) return fail(413, "Der Chat ist zu lang. Fang am besten einen neuen an.");
  let body: { model?: string; effort?: string; messages?: { role?: string; content?: unknown }[] };
  try { body = JSON.parse(raw); } catch { return fail(400, "Ungültige Anfrage."); }
  const { model, effort, messages } = body ?? {};
  if (!model || !MODELS.has(model)) return fail(400, "Dieses Modell ist nicht erlaubt.");
  if (!Array.isArray(messages) || !messages.length || messages.length > 400 ||
      !messages.every((m) => ["system", "user", "assistant"].includes(m?.role ?? "") && typeof m.content === "string")) {
    return fail(400, "Ungültiger Verlauf.");
  }

  const res = await fetch(OPENROUTER, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${key}`, "content-type": "application/json",
      "HTTP-Referer": "https://xbubekir68.github.io/xbubekir/", "X-Title": "xbubekir",
    },
    body: JSON.stringify({
      model, messages, stream: true, max_tokens: MAX_TOKENS, provider: PROVIDER,
      reasoning: { effort: EFFORT.has(effort ?? "") ? effort : "low" },
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
