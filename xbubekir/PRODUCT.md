# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Genau eine Person: die, der xbubekir gehört. Sie nutzt die App meistens am Handy, installiert auf dem Home-Bildschirm, kurz zwischendurch.

Ihre Aufgaben sind so breit wie der Alltag: Fragen beantworten, Schule und Lernen, Texte schreiben, Dinge erklären, planen, nachdenken und Arabisch lernen (zusammen mit der App Mufradaat). Arabisch ist ein Zweck unter mehreren, kein Kernzweck.

## Product Purpose

xbubekir ist die eine persönliche KI für alles, was ansteht. Die Person spricht immer mit derselben KI und entscheidet selbst, welches Modell gerade dahinter denkt.

Erfolg ist nicht als Kennzahl festgelegt.

## Positioning

**Eine KI, viele Gehirne.** xbubekir bleibt dieselbe Persönlichkeit in derselben Oberfläche, egal ob Gemini, Claude, DeepSeek oder die eigene nachtrainierte Browser-KI denkt. Das Modell ist eine Einstellung, nicht das Produkt.

Chats auf dem eigenen Gerät, geringe Kosten und Arabisch sind echte Eigenschaften, wurden aber ausdrücklich nicht als Unterschied gewählt. Sie stützen die Positionierung und ersetzen sie nicht.

**Powered by xbu.** Nach diesem System laufen alle eigenen Projekte: Eine App bekommt KI-Funktionen, und die übernimmt xbu. Erstes Beispiel ist mufradaat.AI, im Logo „powered by xbu“.

## Operating Context

- Installierbare Web-App ohne native Hülle. Läuft unter https://xbubekir68.github.io/xbubekir/, zusammen mit Mufradaat im selben Repository und auf derselben GitHub-Pages-Seite.
- Gemini und DeepSeek laufen über das eigene xbubekir-Konto. Der Server (Supabase-Projekt „xbubekir“, getrennt von Mufradaat) hält die Schlüssel und lässt nur freigeschaltete Konten aus `public.allowed_users` durch.
- Claude läuft mit eigenem Anthropic-Schlüssel. Gemini geht wahlweise auch mit eigenem Schlüssel.
- Die eigene KI wird in Google Colab nachtrainiert (`training/`), liegt öffentlich auf Hugging Face und läuft per WebLLM im Browser.
- Google begrenzt die Gratis-Nutzung pro Minute und pro Tag. Solche Grenzen gehören zum normalen Gebrauch.

## Capabilities and Constraints

### Gehirne

| Gehirn | Zugang | Kosten | Besonderheit |
| --- | --- | --- | --- |
| Gemini (3.8 Flash, 3.5 Flash-Lite) | Konto oder eigener Schlüssel | kostenlos, mit Limits | Standard |
| Claude (Opus, Sonnet, Haiku 5.5) | eigener Schlüssel | nach Nutzung | Websuche mit Quellen bei Opus und Sonnet |
| DeepSeek (V4.1 Flash, V4 Pro) | nur Konto, über OpenRouter | meist unter 0,1 Cent pro Nachricht | Server legt Modelle, Länge und erlaubte Anbieter fest |
| Eigene xbubekir-KI (Qwen3 1,7B) | kein Konto, kein Schlüssel | kostenlos | offline, kein Internet, kleines Kontextfenster |

### Funktionen

- Chat mit Markdown-Antworten, Denkblöcken und Anhalten der Antwort.
- „Über dich“, Name und „Wie xbubekir antworten soll“ fließen in den System-Prompt.
- Denktiefe: Schnell, Normal, Gründlich.
- Kein Gedächtnis über Chats hinaus. Dauerhaftes gehört in „Über dich“.
- Als App installierbar. Die Oberfläche lädt auch offline.

### Feste Regeln

- **Der Faden bleibt:** Ein laufender Chat behält Anbieter, Modell, System-Prompt und Werkzeuge. Ein Wechsel des Anbieters beginnt einen neuen Chat.
- **Datenaussagen je Gehirn:** Einstellungen und Chats liegen immer nur im Browser. Nachrichten gehen aber bei Gemini, Claude und DeepSeek an den jeweiligen Anbieter. „Verlässt dein Gerät nicht“ gilt nur für die eigene KI.
- **Gratis-Stufe von Gemini:** Der Hinweis, dass Google Nachrichten je nach Wohnort lesen und nutzen darf, bleibt in der Einrichtung mit eigenem Schlüssel erhalten.
- **DeepSeek über OpenRouter:** keine Datenspeicherung, keine Anbieter mit Sitz in China, keine fp4-Fassungen.
- **Oberfläche nur auf Deutsch.** xbubekir antwortet in der Sprache, in der die Person schreibt.
- **Statische Seite ohne Build-Schritt für die App:** Oberfläche in `index.html`, Logik in `app.js`, SDKs gebündelt in `vendor/`.
- **Strenge CSP als Meta-Tag in `index.html`:** Diese Datei geht unverändert live, Ausnahmen nur für die Entwicklung sind deshalb nicht möglich.

### Begriffe

Gehirn (Modellwahl), Anbieter, Denktiefe, Schlüssel, Konto, eigene xbubekir-KI, Über dich.

### Noch offen

- Die Anleitung zum eigenen API-Schlüssel richtet sich an jede Person, obwohl die App nur für eine gedacht ist. Ob sie bleibt, ist nicht entschieden.
- Die eigene KI ist auch für Mufradaat Pro gedacht. Wie andere Apps xbu technisch nutzen, ist nicht entschieden. Der Server lässt heute nur Konten aus `public.allowed_users` durch, und das Supabase-Projekt ist von Mufradaat getrennt.

## Brand Commitments

- **Name:** `xbubekir`, immer klein geschrieben.
- **Auftritt:** Logo `xbu`, Schriftzug `xbubekir.ai`, Spruch „Frag. Entdecke. Erreiche mehr.“ Die Oberfläche ist nur dunkel, in Lila.
- **Stimme:** Duzt, locker, herzlich und ehrlich, „wie ein guter Freund, der sich auskennt“. Beginnt direkt mit der Antwort, ohne Floskeln, belehrt nicht. Kurze Frage, kurze Antwort.
- **Identität:** xbubekir spricht als Ich und nennt das Modell dahinter nur auf Nachfrage, dann aber offen. Die Oberfläche zeigt das aktive Gehirn immer als stille Zeile an der Eingabe.
- **Grenzen:** Sagt, wenn etwas unbekannt oder unsicher ist, und erfindet keine Fakten, Zahlen, Zitate oder Quellen.
- **Arabisch:** Immer mit Harakat, dazu Umschrift und deutsche Bedeutung.
- **Assets:** App-Icons in `icons/`.

## Evidence on Hand

- `training/persona.json`: 102 handgeschriebene Beispielgespräche für Ton und Grenzen, die beste Quelle für echte Texte.
- `app.js` (`PERSONA`): ausführliche Persönlichkeit für Gemini, Claude und DeepSeek.
- `training/train.jsonl` und `training/eval.jsonl`: 617 und 33 Zeilen Trainingsdaten.
- `training/uebung.json`: Übungsgespräche je Mufradaat-Lektion. Die arabischen Sätze sind noch ungeprüft, die Prüfliste liegt in `training/dialoge-pruefen.md`.
- Öffentliches Modell: https://huggingface.co/xbubekir/xbubekir-qwen3-1.7b-q4f16_1-MLC

Es gibt keine Nutzerstimmen, Kennzahlen, Benchmarks oder Presse. Nichts davon darf erfunden werden.

## Product Principles

1. **Eine Stimme, jedes Gehirn.** Wer das Modell wechselt, spricht weiter mit xbubekir. Unterschiede zwischen Modellen zeigen sich in dem, was sie können, nicht darin, wer antwortet.
2. **Für eine Person, nicht für ein Publikum.** Entscheidungen folgen dem täglichen Gebrauch der Besitzerperson, nicht möglichen fremden Nutzern.
3. **Zwischendurch zuerst.** Der kurze Griff zum Handy ist der Normalfall. Was dabei stört, zählt mehr als jede Funktion für lange Sitzungen.
4. **Ehrlich je Gehirn.** Kosten, Datenweg und Grenzen stimmen immer für das Gehirn, das gerade denkt.
5. **Der Faden reißt nicht.** Laufende Gespräche bleiben stabil, auch wenn sich Einstellungen ändern.

## Accessibility & Inclusion

Antworten mischen Deutsch und Arabisch mit Harakat, auch innerhalb eines Satzes. Beides muss am Handy gut lesbar bleiben. Ein formaler Standard ist nicht festgelegt.
