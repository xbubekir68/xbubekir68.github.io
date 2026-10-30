// xbubekir Server (Supabase Edge Function „gemini“, Projekt „xbubekir“ – getrennt von Mufradaat):
// leitet Chat-Anfragen an die Gemini-API weiter. Der Gemini-Schlüssel liegt nur hier als Secret GEMINI_API_KEY.
// Zugang nur für angemeldete Nutzer, die in public.allowed_users stehen (Gratis-Stufe: nur der Besitzer).
// Bereitstellen: über das Supabase-MCP-Werkzeug deploy_edge_function (verify_jwt aus, die Prüfung macht der Code selbst).
import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI = "https://generativelanguage.googleapis.com";
const ROUTE = /^\/v1beta\/models\/(gemini-3\.8-flash|gemini-3\.5-flash-lite):(streamGenerateContent|generateContent)$/;
const CORS = {
  "Access-Control-Allow-Origin": "https://xbubekir68.github.io",
  "Access-Control-Allow-Headers": "authorization, content-type, x-goog-api-key, x-goog-api-client, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Fehler im Format der Gemini-API, damit die App sie wie Google-Fehler anzeigt
const fail = (code: number, message: string) =>
  new Response(JSON.stringify({ error: { code, message, status: "XBUBEKIR_SERVER" } }), {
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

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return fail(500, "Auf dem Server fehlt noch der Gemini-Schlüssel (Secret GEMINI_API_KEY).");

  const url = new URL(req.url);
  const path = url.pathname.replace(/^(\/functions\/v1)?\/gemini/, "");
  if (!ROUTE.test(path)) return fail(404, "Diese Anfrage ist nicht erlaubt.");

  const res = await fetch(GEMINI + path + (url.searchParams.get("alt") === "sse" ? "?alt=sse" : ""), {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: await req.text(),
  });
  // Antwort (auch Streaming) unverändert durchreichen
  return new Response(res.body, {
    status: res.status,
    headers: { ...CORS, "content-type": res.headers.get("content-type") ?? "application/json" },
  });
});
