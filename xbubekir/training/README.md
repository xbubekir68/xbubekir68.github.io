# Eigene xbubekir-KI: Trainingsdaten und Training

Ziel: Das Open-Source-Modell **Qwen3-1.7B** (Apache-2.0) wird auf xbubekirs Persönlichkeit und auf einfache Arabisch-Übungsgespräche
nachtrainiert und läuft danach mit WebLLM **im Browser** (kostenlos, keine Daten an Server). In Mufradaat ist es nur für **Pro** gedacht.

## Dateien
| Datei | Inhalt |
| --- | --- |
| `persona.json` | Beispielgespräche für xbubekirs Persönlichkeit (Deutsch), von Hand geschrieben |
| `uebung.json` | Handgeschriebene Übungsgespräche je Mufradaat-Lektion (Arabisch mit Harakat, Umschrift, Deutsch) |
| `make_dataset.mjs` | baut `train.jsonl` / `eval.jsonl`: Persona + Übungsgespräche + automatische Vokabel-Übungen aus `mufradaat/index.html` (`W_RAW`, `LES_RAW`, `SENT_RAW`) |
| `check_dataset.mjs` | prüft Format, Rollen und Harakat der Übungsantworten |
| `review.mjs` → `dialoge-pruefen.md` | Prüfliste der neuen arabischen Sätze für Muttersprachler |
| `xbubekir_training.ipynb` | Colab-Notebook: Training (LoRA), Probelauf, Umwandlung ins WebLLM-Format, Upload zu Hugging Face |

## Ablauf
> **Stand:** Der erste Trainingslauf nutzt die arabischen Übungssätze noch **ungeprüft** (Wunsch des Nutzers). Korrekturen aus `dialoge-pruefen.md` später einarbeiten und nachtrainieren.

1. **Gegenlesen:** `dialoge-pruefen.md` an einen Muttersprachler geben, Korrekturen in `uebung.json` übernehmen.
2. **Datensatz bauen und prüfen:**
   ```
   node xbubekir/training/make_dataset.mjs
   node xbubekir/training/check_dataset.mjs
   node xbubekir/training/review.mjs > xbubekir/training/dialoge-pruefen.md
   ```
   Dann auf `main` bringen (das Notebook lädt die Daten von dort).
3. **Training:** `xbubekir_training.ipynb` in Google Colab öffnen (Datei → Notebook hochladen oder über GitHub), Laufzeit **T4 GPU**,
   Secret `HF_TOKEN` (Hugging-Face-Token mit Schreibrecht) anlegen, Zellen der Reihe nach starten.
4. **Ergebnis:** öffentliches Hugging-Face-Repo `xbubekir/xbubekir-qwen3-1.7b-q4f16_1-MLC` (https://huggingface.co/xbubekir/xbubekir-qwen3-1.7b-q4f16_1-MLC). Diese Adresse wird in xbubekir/Mufradaat eingetragen.
   Die Browser-Bibliothek (wasm) ist die fertige von WebLLM für Qwen3-1.7B q4f16_1. Weil sich beim Nachtrainieren nur die Gewichte ändern,
   muss nichts kompiliert werden.

## Gut zu wissen
- Gelernt wird nur, was xbubekir antwortet (die Eingaben sind im Training ausgeblendet).
- Der System-Prompt der Übungen (`practiceSystem()` in `make_dataset.mjs`) wird später in Mufradaat Pro genauso verwendet.
- Ein 1,7B-Modell ist klein: Für Persönlichkeit, einfache Gespräche und kurze Übungsdialoge reicht es, für Fakten und perfekte Harakat nicht immer.
