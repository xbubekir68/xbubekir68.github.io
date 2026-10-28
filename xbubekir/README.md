# xbubekir

Persönliche KI als Web-App: https://xbubekir68.github.io/xbubekir/

- Denkt mit Claude (Standard: Claude Opus 5.5), wahlweise Sonnet 5.5 oder Haiku 5.5.
- Braucht einen eigenen Anthropic-API-Schlüssel (platform.claude.com → API Keys). Er wird nur im Browser auf dem eigenen Gerät gespeichert und nur an api.anthropic.com geschickt.
- Chats liegen in IndexedDB auf dem Gerät, Einstellungen in localStorage. Es gibt keinen eigenen Server.
- Kann im Internet suchen (Opus/Sonnet), zeigt Quellen und auf Wunsch den Gedankengang.
- „Über dich“ und „Wie xbubekir antworten soll“ landen im System-Prompt. System-Prompt, Modell und Werkzeuge werden pro Chat festgehalten, weil die API sonst die Denkblöcke früherer Antworten verwirft.
- Als App installierbar (Teilen → „Zum Home-Bildschirm“), die Oberfläche lädt auch offline.

Dateien: `index.html` (Oberfläche), `app.js` (Logik), `vendor/anthropic.js` (offizielles Anthropic-SDK als eine Datei, neu bauen mit `bash tools/build-sdk.sh`, danach `V` in `sw.js` hochzählen).
