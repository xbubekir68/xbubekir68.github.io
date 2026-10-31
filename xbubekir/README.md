# xbubekir

Persönliche KI als Web-App: https://xbubekir68.github.io/xbubekir/

- Denkt standardmäßig mit **Gemini von Google, kostenlos** (Gemini 3.8 Flash oder 3.5 Flash-Lite). Dafür braucht es einen eigenen Gemini-API-Schlüssel von https://aistudio.google.com/apikey. Google begrenzt die Gratis-Nutzung pro Minute und pro Tag.
- Wahlweise kostenpflichtig mit **Claude von Anthropic** (Opus 5.5, Sonnet 5.5, Haiku 5.5), dann auch mit Websuche und Quellen. Schlüssel von platform.claude.com.
- **DeepSeek (Open Source)** über OpenRouter (DeepSeek V4.1 Flash oder V4 Pro), nur über das eigene Konto. Kostet pro Nachricht meist unter 0,1 Cent aus dem OpenRouter-Guthaben.
- **Eigene xbubekir-KI** im Browser (WebLLM, nachtrainiertes Qwen3-1.7B, siehe `training/`): kostenlos und offline, aber klein.
- Einstellungen und Chats bleiben im Browser auf dem eigenen Gerät (Einstellungen in localStorage, Chats in IndexedDB). Eigene Schlüssel gehen nur an den jeweiligen Anbieter.
- **Eigener Server** (Supabase-Projekt „xbubekir“, getrennt von Mufradaat): Die Edge Functions `server/gemini` und `server/openrouter` halten die Schlüssel als Secrets (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`) und lassen nur Konten aus `public.allowed_users` durch. `openrouter` legt Modelle, Länge und erlaubte Anbieter fest (keine Datenspeicherung, keine Anbieter mit Sitz in China, keine fp4-Fassungen).
- „Über dich“ und „Wie xbubekir antworten soll“ landen im System-Prompt. Anbieter, Modell, System-Prompt und Werkzeuge werden pro Chat festgehalten, damit die gespeicherten Denkblöcke früherer Antworten gültig bleiben.
- Als App installierbar (Teilen → „Zum Home-Bildschirm“), die Oberfläche lädt auch offline.

Dateien: `index.html` (Oberfläche), `app.js` (Logik), `vendor/genai.js` und `vendor/anthropic.js` (offizielle SDKs als je eine Datei, neu bauen mit `bash tools/build-sdk.sh`, danach `V` in `sw.js` hochzählen).
