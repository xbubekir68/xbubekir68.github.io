# KI-Stimmen für Mufradaat

Die App spielt für jedes Wort, jeden Satz und jeden Buchstaben eine Audiodatei ab, wenn es eine gibt.
Fehlt die Datei, liest wie bisher die Stimme des Geräts vor. Die Dateien liegen in `mufradaat/audio/`,
die Liste dazu in `audio/audio.json`. Beides erzeugt `tools/gen-audio.mjs`.

## 1. Schlüssel besorgen (empfohlen: Microsoft Azure)

1. Auf https://portal.azure.com ein kostenloses Konto anlegen.
2. „Speech service“ (Azure AI Speech) erstellen, Tarif **Free F0**, Region z. B. *West Europe*.
3. Unter „Keys and Endpoint“ Key 1 und die Region kopieren.
4. Datei `mufradaat/tools/.env` anlegen (sie wird nicht hochgeladen):

```
AZURE_SPEECH_KEY=dein-schlüssel
AZURE_SPEECH_REGION=westeurope
```

Andere Anbieter gehen auch, mit diesen Zeilen in derselben Datei:
`GOOGLE_TTS_KEY=` (Google Cloud Text-to-Speech), `ELEVENLABS_API_KEY=`, `OPENAI_API_KEY=`.

## 2. Stimmen vergleichen

Im Ordner `mufradaat` (Node 18 oder neuer nötig, https://nodejs.org):

```
node tools/gen-audio.mjs proben --anbieter azure
```

Dann `audio-proben/index.html` im Browser öffnen. Dort stehen zehn Wörter mit schwierigen Lauten
(ʿAyn, ḥ, q, ṭ, ẓ, Hamza, Schadda, Artikel) und ein Satz, jeweils in sechs Stimmen.

## 3. Alle Dateien erzeugen

```
node tools/gen-audio.mjs alle --anbieter azure --stimme ar-SA-HamedNeural
```

Das sind etwa 420 Texte mit rund 3.400 Zeichen, also weit unter der kostenlosen Grenze.
Später nur noch dasselbe Kommando ausführen: Es erzeugt nur neue oder geänderte Texte
(wenn du Vokalzeichen korrigierst, wird das Wort neu vertont). Danach committen und pushen.
Das Tempo lässt sich mit `--tempo -20%` (langsamer) oder `--tempo 0%` ändern.

## 4. Eigene Aufnahmen von Muttersprachlern

Eigene Aufnahmen haben immer Vorrang. In `audio/liste.csv` (öffnet in Excel) steht für jeden Text,
wohin die Datei gehört, z. B. `audio/eigen/w/kitab.mp3`. Datei dort ablegen (mp3, m4a, ogg oder wav), dann:

```
node tools/gen-audio.mjs liste
```

Das braucht keinen Schlüssel. Die KI-Datei bleibt liegen und springt wieder ein, wenn du die Aufnahme löschst.

## 5. Silben selbst aufnehmen

Die Etappen „Kurze Vokale“ und „Tanwin“ brauchen kurze Silben wie بَ بِ بُ oder بًا بٍ بٌ.
In `audio/liste.csv` stehen sie mit IDs der Form `sb/<Buchstabe>-<Zeichen>`, z. B. `sb/ba-a` für بَ,
`sb/ba-i` für بِ, `sb/ba-an` für بًا und `sb/tam-un` für ةٌ. Die Aufnahme kommt nach `audio/eigen/sb/ba-a.mp3` usw.,
danach `node tools/gen-audio.mjs liste` ausführen. Nur وَ (wa) liegt als Wort unter `w/wa`.

Tipps: eine Silbe pro Datei, ohne lange Pause davor und danach, gleichmäßig laut.
Beim Tanwin das n deutlich sprechen (ban, bin, bun), damit man es von ba, bi, bu unterscheiden kann.
Solange eine Aufnahme fehlt, spricht die KI-Stimme als Platzhalter, sobald ihre Dateien erzeugt sind.
