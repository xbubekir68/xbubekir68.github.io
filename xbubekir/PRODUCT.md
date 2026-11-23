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

Chats in eigener Hand, geringe Kosten und Arabisch sind echte Eigenschaften, wurden aber ausdrücklich nicht als Unterschied gewählt. Sie stützen die Positionierung und ersetzen sie nicht.

**Powered by xbu.** Nach diesem System laufen alle eigenen Projekte: Eine App bekommt KI-Funktionen, und die übernimmt xbu. Erstes Beispiel ist mufradaat.AI, im Logo „powered by xbu“.

## Operating Context

- Installierbare Web-App ohne native Hülle. Läuft unter https://xbubekir68.github.io/xbubekir/, zusammen mit Mufradaat im selben Repository und auf derselben GitHub-Pages-Seite.
- Gemini und DeepSeek laufen über das eigene xbubekir-Konto. Der Server (Supabase-Projekt „xbubekir“, getrennt von Mufradaat) hält die Schlüssel und lässt nur freigeschaltete Konten aus `public.allowed_users` durch. Eine geprüfte Anmeldung merkt er sich bis zu 5 Minuten, eine Sperre oder Abmeldung wirkt also spätestens nach 5 Minuten.
- Gemini geht wahlweise auch mit eigenem Schlüssel.
- Claude und die eigene Browser-KI (Qwen3, WebLLM) gibt es seit November 2026 nicht mehr. Alte Chats damit lassen sich noch lesen, eine neue Nachricht beginnt einen neuen Chat.
- Google begrenzt die Gratis-Nutzung pro Minute und pro Tag. Solche Grenzen gehören zum normalen Gebrauch.

## Capabilities and Constraints

### Gehirne

| Gehirn | Zugang | Kosten | Besonderheit |
| --- | --- | --- | --- |
| Gemini (3.8 Flash, 3.5 Flash-Lite) | Konto oder eigener Schlüssel | kostenlos, mit Limits | Standard |
| DeepSeek, in der Oberfläche „xbu“ (V4.1 Flash) und „xbu.plus“ (V4 Pro) | nur Konto, über OpenRouter | meist unter 0,1 Cent pro Nachricht | Server legt Modelle, Länge und erlaubte Anbieter fest; Websuche mit Quellen (etwa 0,5 Cent pro Suche, höchstens 3 pro Antwort) |

### Funktionen

- xbu vorne, DeepSeek im Hintergrund: Die Oberfläche zeigt den Anbieter als „xbu“, DeepSeek V4.1 Flash als „xbu“ und DeepSeek V4 Pro als „xbu.plus“ (Modellauswahl, Gehirn-Zeile, Chatliste, Einstellungen, Fehlermeldungen). DeepSeek steht nur noch in der Modellinfo der Einstellungen. Die Einstellungen sagen dazu: „xbu basiert auf DeepSeek V4.1 Flash, xbu.plus auf DeepSeek V4 Pro. Beide Modelle stehen unter der MIT-Lizenz. Der Zugriff erfolgt über OpenRouter.“ Technische Modell-IDs, Preise und Chats bleiben gleich.
- Chat mit Markdown-Antworten, Denkblöcken und Anhalten der Antwort. Die Antwort erscheint Zeichen für Zeichen getippt statt in Brocken (mindestens 120 Zeichen pro Sekunde, bei Rückstand schneller, damit sie nie weit hinter dem Netz liegt). „Anhalten“ zeigt den Rest sofort. Im Sprachmodus und bei „weniger Bewegung“ erscheint sie ohne Animation. Die letzte Antwort lässt sich neu erzeugen, eine abgeschnittene fortsetzen. „Kopieren“ liefert Klartext ohne Markdown-Zeichen.
- Gehirn wechseln per Tipp auf die Gehirn-Angabe in der Eingabe-Karte: ein Blatt mit allen Modellen, der Denktiefe und dem Internet-Schalter, ohne Speichern-Knopf. Ein anderes Modell beginnt im laufenden Chat einen neuen Chat; Denktiefe und Internet gelten sofort, auch im laufenden Chat.
- Am PC eine Seitenleiste mit Chats nach Datum und Suche, am Handy eine Kopfleiste mit Schublade (auch quer) und die letzten Chats auf dem Startbild.
- Gezeichnete Bilder: Gemini und DeepSeek können Vektorbilder (SVG) zeichnen, etwa Logos, Icons, Diagramme oder einfache Illustrationen. Ein ```svg-Block erscheint als Bild auf hellem Zeichenblatt, mit „Als Bild sichern“ (PNG, am iPhone übers Teilen-Menü in Fotos), „SVG“ und dem eingeklappten Code. Das SVG kommt nur als Bild in die Seite, so kann es kein Skript ausführen und nichts nachladen. Fotos erzeugt xbubekir nicht.
- Fehler stehen in kurzen Worten mit passenden Knöpfen da, die Originalmeldung eingeklappt darunter.
- Arabisch wird als Arabisch gesetzt: eigene Schrift, größer für die Harakat, rein arabische Absätze von rechts nach links.
- Der Entwurf im Eingabefeld bleibt gespeichert, falls die App zwischendurch zugeht.
- Chats auf allen Geräten: Mit Konto liegen die Chats zusätzlich auf dem eigenen Server (Tabelle `public.chats`, nur das eigene Konto und nur freigeschaltete Konten kommen heran). Die App lädt jede Änderung kurz danach hoch und holt beim Start, beim Zurückkehren und wenn das Netz wieder da ist, was andere Geräte geändert haben. Wurde derselbe Chat auf zwei Geräten geändert, gilt die neuere Fassung. Offline läuft alles weiter und gleicht sich später ab. „Alle Chats löschen“ löscht mit Konto auch auf den anderen Geräten. Ohne Konto (nur eigener Gemini-Schlüssel) bleiben die Chats auf dem Gerät.
- Sprachmodus (Wellen-Knopf im Eingabefeld): sprechen statt tippen, mit jedem Gehirn. In Gemini-Chats läuft er über Gemini Live (gemini-3.8-live, seit 22.11.2026): Der Mikrofon-Ton geht per WebSocket direkt an Google, die gesprochene Antwort kommt sofort als Ton zurück, Erkennen, Denken und Sprechen in einem Schritt. Google erkennt das Ende der Frage selbst (600 ms Pause), Dazwischenreden unterbricht die Antwort, und die Mitschrift beider Seiten landet nach jeder Runde im Chat. Mit Konto stellt der eigene Server dafür einen Kurzzeit-Schlüssel aus (nur eine Sitzung, nur das Live-Modell), mit eigenem Schlüssel geht es direkt. Klappt das erste Verbinden nicht, nimmt die App den bisherigen Weg. Der funktioniert auch in xbu-Chats: Der Browser erkennt die Sprache (Deutsch, Arabisch oder Englisch), die Antwort wird Satz für Satz vorgelesen, schon während sie hereinkommt, danach hört xbubekir wieder zu. Ein Tipp auf den Kreis unterbricht. Der Kreis lebt: Beim Zuhören folgt er der Lautstärke am Mikrofon (nur der Pegel wird gemessen, solange zugehört wird, nichts wird aufgenommen), beim Vorlesen schwingt er mit jedem Wort. Alles landet als normaler Chat. Ein Chat, der im Sprachmodus beginnt, bekommt kurze, vorlesbare Antworten. Vorgelesen wird mit einer Gemini-Stimme (Gemini 3.8 Flash-Lite TTS, sechs weibliche Stimmen, Standard „Sulafat“), der nächste Abschnitt wird schon geholt, während der aktuelle läuft. Ohne Zugang oder nach einem Fehler (etwa Limit erreicht) liest die Gerätestimme weiter. Der erste Ton startet schon am ersten Komma, Stille am Anfang und Ende der Abschnitte wird gekürzt, und zwei Player wechseln sich ab, damit kaum Pausen entstehen. Unten im Sprachmodus steht nach jeder Runde, wie lange Antwort und Stimme gebraucht haben. Stimme mit „Anhören“-Probe und Tempo stehen in den Einstellungen.
- „Über dich“, Name und „Wie xbubekir antworten soll“ fließen in den System-Prompt.
- Denktiefe: Schnell, Normal, Gründlich.
- Gedächtnis (Einstellungen → Gedächtnis, aus, bis die Person es ausdrücklich einschaltet, nur mit Konto): Nach jeder Antwort prüft xbu (DeepSeek V4.1 Flash über den eigenen Server, egal welches Gehirn den Chat führt) die Nachricht der Person und legt kurze Erinnerungen an, ändert veraltete statt Doppelte anzulegen oder löscht sie, wenn die Person es sagt. Arten: Über dich (person), Wie du Antworten magst (vorliebe), Projekt mit Namen (projekt), Sonstiges (info). Jede Erinnerung hat Quelle (Chat), Zeit und „gesagt“, „vermutet“ oder „von dir eingetragen“. Ein neuer Chat bekommt beim ersten Satz alles über die Person und die Vorlieben, dazu Passendes aus Sonstiges und höchstens ein Projekt, damit sich Projekte nicht vermischen. Die Erinnerungen stehen als markierte Daten in der Anweisung an die KI, nicht als Befehle. Eine Rückmeldung („Gemerkt: …“) zeigt jede Änderung. In den Einstellungen lässt sich alles ansehen, ändern, löschen, selbst eintragen und auf einmal vergessen. Löschen ist echtes Löschen, auch in laufenden Chats. Passwörter und Zugangsdaten kommen nie hinein, Gesundheit, Glauben, Politik und ähnlich Sensibles nur auf ausdrückliche Bitte. Ohne Gedächtnis bleibt „Über dich“ der Ort für Dauerhaftes.
- Kurzzeitgedächtnis ist der laufende Chat: Er geht vollständig an das Gehirn, bis der Server ihn als zu lang ablehnt.
- Als App installierbar. Die Oberfläche lädt auch offline.
- Update-Hinweis: Ist eine neue Version da, erscheint oben „Update verfügbar“ mit „Neu starten“. Die App fragt beim Zurückkehren und alle 30 Minuten danach. Eine laufende Antwort wird vor dem Neustart angehalten, ihr Text bleibt im Chat. Bricht der Start ab (etwa kurz nach einem Update, wenn der Server schon das neue `app.js`, aber noch das alte `index.html` liefert), lädt die App sich selbst neu, höchstens zweimal, danach steht ein Hinweis da.

### Feste Regeln

- **Der Faden bleibt:** Ein laufender Chat behält Anbieter, Modell und System-Prompt. Ein Wechsel des Anbieters beginnt einen neuen Chat. Einzige Ausnahme: Der Internet-Schalter ändert im laufenden DeepSeek-Chat Werkzeug und Websuche-Satz im System-Prompt.
- **Datenaussagen je Gehirn:** Einstellungen liegen nur im Browser. Chats liegen im Browser und, mit Konto, auf dem eigenen Supabase-Server, damit sie auf allen Geräten da sind. Nachrichten gehen aber an den jeweiligen Anbieter (Google oder über OpenRouter an DeepSeek). Mit Gedächtnis liegen die Erinnerungen auf dem eigenen Server, und jede Nachricht geht zusätzlich an xbu über OpenRouter.
- **Sprachmodus:** In Gemini-Chats geht dein Ton an Google (Gemini Live), das steht im Sprachmodus selbst. Sonst läuft die Spracherkennung über Server des Browser-Herstellers (Safari: Apple, Chrome: Google, Edge: Microsoft). Der Hinweis dazu steht im Sprachmodus selbst. Mit einer Gemini-Stimme geht zusätzlich der vorgelesene Text an Google (über den eigenen Server oder mit dem eigenen Schlüssel).
- **Gratis-Stufe von Gemini:** Der Hinweis, dass Google Nachrichten je nach Wohnort lesen und nutzen darf, bleibt in der Einrichtung mit eigenem Schlüssel erhalten.
- **DeepSeek über OpenRouter:** keine Datenspeicherung, keine Anbieter mit Sitz in China, keine fp4-Fassungen.
- **Oberfläche nur auf Deutsch.** xbubekir antwortet in der Sprache, in der die Person schreibt.
- **Statische Seite ohne Build-Schritt für die App:** Oberfläche in `index.html`, Logik in `app.js`, SDKs gebündelt in `vendor/`.
- **Jede neue Version zählt `V` in `sw.js` hoch.** Nur eine geänderte `sw.js` erkennt der Browser als Update, sonst kommt kein Update-Hinweis.
- **Strenge CSP als Meta-Tag in `index.html`:** Diese Datei geht unverändert live, Ausnahmen nur für die Entwicklung sind deshalb nicht möglich.

### Begriffe

Gehirn (Modellwahl), Anbieter, Denktiefe, Internet, Schlüssel, Konto, Über dich, Sprachmodus, Gedächtnis, Erinnerung.

### Noch offen

- Gedächtnis, nächste Schritte bei Bedarf: Auswahl über Embeddings (pgvector) statt Wortanfängen, sobald es viele hundert Erinnerungen werden (Grenze jetzt 300); Zusammenhänge zwischen Zielen, Projekten und Lernstand.

- Die Anleitung zum eigenen API-Schlüssel richtet sich an jede Person, obwohl die App nur für eine gedacht ist. Ob sie bleibt, ist nicht entschieden.
- Wie weitere Apps xbu nutzen, folgt dem Beispiel Mufradaat: Für mufradaat.AI gibt es im Projekt „xbubekir AI“ die eigene Edge Function `mufradaat` (DeepSeek V4.1 Flash über OpenRouter, derselbe Schlüssel). Sie prüft Konten von Mufradaat bei dessen eigener Anmeldung, legt die Anweisung an die KI selbst fest und zählt Nachrichten pro Konto und Tag (`public.mufradaat_ai_usage`).

## Brand Commitments

- **Name:** `xbubekir`, immer klein geschrieben.
- **Auftritt:** Logo `xbu`, Schriftzug `xbubekir.ai`, Spruch „Frag. Entdecke. Erreiche mehr.“ (steht nicht mehr auf dem Startbild). Die Oberfläche ist nur dunkel: ruhige, neutrale Flächen, Lila nur als Akzent (Logo, Senden, Fokus, Auswahl). Maßstab für Aufbau und Qualität ist die Claude-App, bewusst gewählt statt eines eigenen Stils (21.11.2026).
- **Stimme:** Duzt, locker, herzlich und ehrlich, „wie ein guter Freund, der sich auskennt“. Beginnt direkt mit der Antwort, ohne Floskeln, belehrt nicht. Kurze Frage, kurze Antwort.
- **Identität:** xbubekir spricht als Ich und nennt das Modell dahinter nur auf Nachfrage, dann aber offen, bei xbu und xbu.plus mit dem echten DeepSeek-Modell. Die Oberfläche zeigt das aktive Gehirn immer als stille Angabe in der Eingabe-Karte.
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
