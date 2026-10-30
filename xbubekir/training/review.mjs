// Erzeugt die Prüfliste der neuen arabischen Übungssätze für Muttersprachler:
// node xbubekir/training/review.mjs > xbubekir/training/dialoge-pruefen.md   (Format wie mufradaat/tools/saetze-pruefen.md)
import fs from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const lessons = JSON.parse(fs.readFileSync(here + "uebung.json", "utf8")).lessons;
const AR = /[؀-ۿ]/;
const rows = [], seen = new Set();
for (const [t, dialogs] of Object.entries(lessons)) for (const d of dialogs) for (const turn of d) {
  const r = turn.a ? { ar: turn.a.ar, tr: turn.a.tr, de: turn.a.de, wer: "xbubekir" }
    : AR.test(turn.u) ? { ar: turn.u, tr: "", de: "", wer: "Lernender (wird als richtig gelobt)" } : null;
  if (!r || seen.has(r.ar)) continue;
  seen.add(r.ar); rows.push({ t, ...r });
}
const out = [
  "# Übungsdialoge zum Gegenlesen\n",
  `${rows.length} arabische Zeilen aus den Übungsgesprächen für die eigene xbubekir-KI (Mufradaat Pro). Bitte jede Zeile prüfen und Korrekturen als Liste zurückschicken (Nummer + richtige Form).\n`,
  "**Worauf es ankommt**\n",
  "1. Ist der Satz richtiges Hocharabisch (Fusha) und klingt natürlich?",
  "2. Stimmen die Vokalzeichen (Harakat) in jedem Wort?",
  "3. Stimmt die Übereinstimmung von Geschlecht und Zahl?",
  "4. Stimmen die **Endungen** (Kasus und Tanwin)?",
  "5. Passt die Umschrift und die deutsche Übersetzung?\n",
  "| Nr. | Lektion | Wer | Arabisch | Umschrift | Deutsch |",
  "| --- | --- | --- | --- | --- | --- |",
  ...rows.map((r, i) => `| ${i + 1} | ${r.t} | ${r.wer} | ${r.ar} | ${r.tr} | ${r.de} |`),
];
console.log(out.join("\n"));
