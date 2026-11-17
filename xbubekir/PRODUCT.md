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

**Eine KI, viele Gehirne.** xbubekir bleibt dieselbe Persönlichkeit in derselben Oberfläche, egal ob Gemini oder DeepSeek denkt. Das Modell ist eine Einstellung, nicht das Produkt.

Chats auf dem eigenen Gerät, geringe Kosten und Arabisch sind echte Eigenschaften, wurden aber ausdrücklich nicht als Unterschied gewählt. Sie stützen die Positionierung und ersetzen sie nicht.

**Powered by xbu.** Nach diesem System laufen alle eigenen Projekte: Eine App bekommt KI-Funktionen, und die übernimmt xbu. Erstes Beispiel ist mufradaat.AI, im Logo „powered by xbu“.

## Operating Context

- Installierbare Web-App ohne native Hülle. Läuft unter https://xbubekir68.github.io/xbubekir/, zusammen mit Mufradaat im selben Repository und auf derselben GitHub-Pages-Seite.
- Gemini und DeepSeek laufen über das eigene xbubekir-Konto. Der Server (Supabase-Projekt „xbubekir“, getrennt von Mufradaat) hält die Schlüssel und lässt nur freigeschaltete Konten aus `public.allowed_users` durch.
- Gemini geht wahlweise auch mit eigenem Schlüssel.
- Claude und die eigene Browser-KI (Qwen3, WebLLM) gibt es seit November 2026 nicht mehr. Alte Chats damit lassen sich noch lesen, eine neue Nachricht beginnt einen neuen Chat.
- Google begrenzt die Gratis-Nutzung pro Minute und pro Tag. Solche Grenzen gehören zum normalen Gebrauch.

## Capabilities and Constraints

### Gehirne

| Gehirn | Zugang | Kosten | Besonderheit |
| --- | --- | --- | --- |
| Gemini (3.8 Flash, 3.5 Flash-Lite) | Konto oder eigener Schlüssel | kostenlos, mit Limits | Standard |
| DeepSeek (V4.1 Flash, V4 Pro) | nur Konto, über OpenRouter | meist unter 0,1 Cent pro Nachricht | Server legt Modelle, Länge und erlaubte Anbieter fest; Websuche mit Quellen (etwa 0,5 Cent pro Suche, höchstens 3 pro Antwort) |

### Funktionen

- Chat mit Markdown-Antworten, Denkblöcken und Anhalten der Antwort. Die letzte Antwort lässt sich neu erzeugen, eine abgeschnittene fortsetzen. „Kopieren“ liefert Klartext ohne Markdown-Zeichen.
- Gehirn wechseln per Tipp auf die Gehirn-Zeile: ein Blatt mit allen Modellen, der Denktiefe und dem Internet-Schalter, ohne Speichern-Knopf. Ein anderes Modell beginnt im laufenden Chat einen neuen Chat; Denktiefe und Internet gelten sofort, auch im laufenden Chat.
- Am PC eine Seitenleiste mit Chats nach Datum und Suche, am Handy eine Kopfleiste mit Schublade (auch quer) und die letzten Chats auf dem Startbild.
- Gezeichnete Bilder: Gemini und DeepSeek können Vektorbilder (SVG) zeichnen, etwa Logos, Icons, Diagramme oder einfache Illustrationen. Ein ```svg-Block erscheint als Bild auf hellem Zeichenblatt, mit „Als Bild sichern“ (PNG, am iPhone übers Teilen-Menü in Fotos), „SVG“ und dem eingeklappten Code. Das SVG kommt nur als Bild in die Seite, so kann es kein Skript ausführen und nichts nachladen. Fotos erzeugt xbubekir nicht.
- Fehler stehen in kurzen Worten mit passenden Knöpfen da, die Originalmeldung eingeklappt darunter.
- Arabisch wird als Arabisch gesetzt: eigene Schrift, größer für die Harakat, rein arabische Absätze von rechts nach links.
- Der Entwurf im Eingabefeld bleibt gespeichert, falls die App zwischendurch zugeht.
- Sprachmodus (Wellen-Knopf im Eingabefeld): sprechen statt tippen, mit jedem Gehirn. Der Browser erkennt die Sprache (Deutsch, Arabisch oder Englisch), die Antwort wird Satz für Satz vorgelesen, schon während sie hereinkommt, danach hört xbubekir wieder zu. Ein Tipp auf den Kreis unterbricht. Der Kreis lebt: Beim Zuhören folgt er der Lautstärke am Mikrofon (nur der Pegel wird gemessen, solange zugehört wird, nichts wird aufgenommen), beim Vorlesen schwingt er mit jedem Wort. Alles landet als normaler Chat. Ein Chat, der im Sprachmodus beginnt, bekommt kurze, vorlesbare Antworten. Vorgelesen wird mit einer Gemini-Stimme (Gemini 3.8 Flash-Lite TTS, sechs weibliche Stimmen, Standard „Sulafat“), der nächste Abschnitt wird schon geholt, während der aktuelle läuft. Ohne Zugang oder nach einem Fehler (etwa Limit erreicht) liest die Gerätestimme weiter. Stimme mit „Anhören“-Probe und Tempo stehen in den Einstellungen.
- „Über dich“, Name und „Wie xbubekir antworten soll“ fließen in den System-Prompt.
- Denktiefe: Schnell, Normal, Gründlich.
- Kein Gedächtnis über Chats hinaus. Dauerhaftes gehört in „Über dich“.
- Als App installierbar. Die Oberfläche lädt auch offline.

### Feste Regeln

- **Der Faden bleibt:** Ein laufender Chat behält Anbieter, Modell und System-Prompt. Ein Wechsel des Anbieters beginnt einen neuen Chat. Einzige Ausnahme: Der Internet-Schalter ändert im laufenden DeepSeek-Chat Werkzeug und Websuche-Satz im System-Prompt.
- **Datenaussagen je Gehirn:** Einstellungen und Chats liegen immer nur im Browser. Nachrichten gehen aber an den jeweiligen Anbieter (Google oder über OpenRouter an DeepSeek).
- **Sprachmodus:** Die Spracherkennung läuft über Server des Browser-Herstellers (Safari: Apple, Chrome: Google, Edge: Microsoft). Der Hinweis dazu steht im Sprachmodus selbst. Mit einer Gemini-Stimme geht zusätzlich der vorgelesene Text an Google (über den eigenen Server oder mit dem eigenen Schlüssel).
- **Gratis-Stufe von Gemini:** Der Hinweis, dass Google Nachrichten je nach Wohnort lesen und nutzen darf, bleibt in der Einrichtung mit eigenem Schlüssel erhalten.
- **DeepSeek über OpenRouter:** keine Datenspeicherung, keine Anbieter mit Sitz in China, keine fp4-Fassungen.
- **Oberfläche nur auf Deutsch.** xbubekir antwortet in der Sprache, in der die Person schreibt.
- **Statische Seite ohne Build-Schritt für die App:** Oberfläche in `index.html`, Logik in `app.js`, SDKs gebündelt in `vendor/`.
- **Strenge CSP als Meta-Tag in `index.html`:** Diese Datei geht unverändert live, Ausnahmen nur für die Entwicklung sind deshalb nicht möglich.

### Begriffe

Gehirn (Modellwahl), Anbieter, Denktiefe, Internet, Schlüssel, Konto, Über dich, Sprachmodus.

### Noch offen

- Die Anleitung zum eigenen API-Schlüssel richtet sich an jede Person, obwohl die App nur für eine gedacht ist. Ob sie bleibt, ist nicht entschieden.
- Wie weitere Apps xbu nutzen, folgt dem Beispiel Mufradaat: Für mufradaat.AI gibt es im Projekt „xbubekir AI“ die eigene Edge Function `mufradaat` (DeepSeek V4.1 Flash über OpenRouter, derselbe Schlüssel). Sie prüft Konten von Mufradaat bei dessen eigener Anmeldung, legt die Anweisung an die KI selbst fest und zählt Nachrichten pro Konto und Tag (`public.mufradaat_ai_usage`).

## Brand Commitments

- **Name:** `xbubekir`, immer klein geschrieben.
- **Auftritt:** Logo `xbu`, Schriftzug `xbubekir.ai`, Spruch „Frag. Entdecke. Erreiche mehr.“ Die Oberfläche ist nur dunkel, in Lila.
- **Stimme:** Duzt, locker, herzlich und ehrlich, „wie ein guter Freund, der sich auskennt“. Beginnt direkt mit der Antwort, ohne Floskeln, belehrt nicht. Kurze Frage, kurze Antwort.
- **Identität:** xbubekir spricht als Ich und nennt das Modell dahinter nur auf Nachfrage, dann aber offen. Die Oberfläche zeigt das aktive Gehirn immer als stille Zeile an der Eingabe.
- **Grenzen:** Sagt, wenn etwas unbekannt oder unsicher ist, und erfindet keine Fakten, Zahlen, Zitate oder Quellen.
- **Arabisch:** Immer mit Harakat, dazu Umschrift und deutsche Bedeutung.
- **Assets:** App-Icons in `icons/`.

## Evidence on Hand

- `app.js` (`PERSONA`): ausführliche Persönlichkeit für Gemini und DeepSeek.
- In der Git-Geschichte (vor dem Entfernen der eigenen KI): `training/persona.json` mit 102 handgeschriebenen Beispielgesprächen für Ton und Grenzen, die beste Quelle für echte Texte, und `training/uebung.json` mit Übungsgesprächen je Mufradaat-Lektion (arabische Sätze ungeprüft). Zurückholen mit `git checkout 2d15023 -- xbubekir/training`.

Es gibt keine Nutzerstimmen, Kennzahlen, Benchmarks oder Presse. Nichts davon darf erfunden werden.

## Product Principles

1. **Eine Stimme, jedes Gehirn.** Wer das Modell wechselt, spricht weiter mit xbubekir. Unterschiede zwischen Modellen zeigen sich in dem, was sie können, nicht darin, wer antwortet.
2. **Für eine Person, nicht für ein Publikum.** Entscheidungen folgen dem täglichen Gebrauch der Besitzerperson, nicht möglichen fremden Nutzern.
3. **Zwischendurch zuerst.** Der kurze Griff zum Handy ist der Normalfall. Was dabei stört, zählt mehr als jede Funktion für lange Sitzungen.
4. **Ehrlich je Gehirn.** Kosten, Datenweg und Grenzen stimmen immer für das Gehirn, das gerade denkt.
5. **Der Faden reißt nicht.** Laufende Gespräche bleiben stabil, auch wenn sich Einstellungen ändern.

## Accessibility & Inclusion

Antworten mischen Deutsch und Arabisch mit Harakat, auch innerhalb eines Satzes. Beides muss am Handy gut lesbar bleiben. Ein formaler Standard ist nicht festgelegt.
