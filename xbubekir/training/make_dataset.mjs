// Baut den Trainingsdatensatz für die eigene xbubekir-KI: node xbubekir/training/make_dataset.mjs
// Quellen: persona.json (Persönlichkeit), uebung.json (handgeschriebene Übungsgespräche),
// dazu automatisch erzeugte Vokabel-Übungen aus Mufradaats Wortliste (W_RAW, LES_RAW) und den geprüften Sätzen (SENT_RAW).
// Ergebnis: train.jsonl und eval.jsonl im Chat-Format {"messages":[{role,content},…]}.
import fs from "node:fs";
import vm from "node:vm";

const here = new URL(".", import.meta.url).pathname;
const html = fs.readFileSync(new URL("../../mufradaat/index.html", import.meta.url).pathname, "utf8");
const pick = n => vm.runInNewContext(html.match(new RegExp("const " + n + "=(\\[[\\s\\S]*?\\n?\\]);\\s*\\n"))[1]); // wie mufradaat/tools/validate-words.mjs
const W = Object.fromEntries(pick("W_RAW").map(r => [r[0], { id: r[0], ar: r[1], tr: r[2], de: r[3] }]));
const LES = pick("LES_RAW").map(([t, g, ids]) => ({ t, g, words: ids.map(id => W[id]) }));
const SENT = pick("SENT_RAW").map(([de, tr, toks, q]) => {
  const parts = toks.split(" ").map(x => x.split("|"));
  return { de, tr, ar: parts.map(p => p[0]).join(" ") + (q ? "؟" : "."), ids: parts.map(p => p[1]) };
});
const persona = JSON.parse(fs.readFileSync(here + "persona.json", "utf8"));
const uebung = JSON.parse(fs.readFileSync(here + "uebung.json", "utf8")).lessons;

// fester Zufall, damit der Datensatz bei jedem Lauf gleich ist
let seed = 20261030;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const any = a => a[Math.floor(rnd() * a.length)];

// Dieser System-Prompt wird später in Mufradaat Pro genauso verwendet (gleiche Funktion dort nachbauen)
export function practiceSystem(les) {
  return `Du bist xbubekir, Übungspartner in Mufradaat Pro. Lektion: ${les.t} (${les.g}).
Wörter dieser Lektion: ${les.words.map(w => `${w.ar} (${w.tr}) = ${w.de}`).join("; ")}.
Führe ein sehr einfaches Gespräch auf Hocharabisch mit diesen Wörtern. Antworte immer so: erste Zeile Arabisch mit Harakat (fett), zweite Zeile Umschrift (kursiv), dritte Zeile Deutsch, danach eine kurze Frage oder Aufgabe auf Deutsch. Lobe richtige Antworten und verbessere Fehler freundlich.`;
}
const reply = a => `**${a.ar}**\n*${a.tr}*\n${a.de}\n\n${a.q}`;
const conv = (system, turns) => ({ messages: [{ role: "system", content: system },
  ...turns.map(t => t.u !== undefined ? { role: "user", content: t.u } : { role: "assistant", content: typeof t.a === "string" ? t.a : reply(t.a) })] });

const out = [];
// 1. Persönlichkeit (doppelt gewichtet, damit sie sitzt)
for (const d of persona.dialogs) for (let k = 0; k < 2; k++) out.push(conv(persona.system, d));
// 2. Handgeschriebene Übungsgespräche (dreifach gewichtet; zusätzlich jedes Gespräch auch ab der 2. Runde)
for (const [title, dialogs] of Object.entries(uebung)) {
  const les = LES.find(l => l.t === title);
  if (!les) throw new Error(`Lektion „${title}“ aus uebung.json gibt es in Mufradaat nicht`);
  for (const d of dialogs) for (let k = 0; k < 3; k++) out.push(conv(practiceSystem(les), d));
}
// 3. Automatische Vokabel-Übungen: pro Wort eine zufällige Übungsart (nur geprüfte Formen aus Mufradaat)
const lob = ["Sehr gut!", "Richtig!", "Genau!", "Super!", "Prima!"];
for (const les of LES) {
  const sys = practiceSystem(les);
  for (const w of les.words) {
    const kind = any(["heisst", "bedeutet", "quiz"]);
    if (kind === "heisst") out.push(conv(sys, [
      { u: any([`Was heißt „${w.de}“ auf Arabisch?`, `Wie sagt man ${w.de}?`, `${w.de} auf Arabisch?`]) },
      { a: { ar: w.ar, tr: w.tr, de: w.de, q: any(["Sprich es laut nach. Noch ein Wort?", "Kannst du es einmal schreiben?", "Merk dir die Harakat. Möchtest du ein weiteres Wort?"]) } }]));
    else if (kind === "bedeutet") out.push(conv(sys, [
      { u: any([`Was bedeutet ${w.ar}?`, `Was heißt ${w.ar} auf Deutsch?`, `${w.tr}?`]) },
      { a: { ar: w.ar, tr: w.tr, de: w.de, q: any(["Kennst du noch ein Wort aus dieser Lektion?", "Willst du ein Wort abgefragt werden?", "Sollen wir weitermachen?"]) } }]));
    else {
      const other = any(les.words.filter(x => x !== w));
      out.push(conv(sys, [
        { u: any(["Frag mich ab.", "Quiz bitte!", "Teste mich."]) },
        { a: { ar: w.ar, tr: w.tr, de: "Was bedeutet dieses Wort?", q: "Antworte auf Deutsch." } },
        { u: w.de },
        { a: { ar: "نَعَمْ!", tr: "naʿam!", de: "Ja!", q: `${any(lob)} ${w.ar} heißt „${w.de}“. Nächstes Wort: Was heißt ${other.ar}?` } },
        { u: "weiß ich nicht" },
        { a: { ar: other.ar, tr: other.tr, de: other.de, q: `Kein Problem: ${other.ar} (${other.tr}) heißt „${other.de}“. Sprich es einmal laut nach.` } }]));
    }
  }
}
// 4. Beispielsätze aus den geprüften Sätzen (SENT_RAW) zur passenden Lektion
for (const s of SENT) {
  const les = LES.find(l => l.words.some(w => s.ids.includes(w.id)));
  const w = les.words.find(x => s.ids.includes(x.id));
  out.push(conv(practiceSystem(les), [
    { u: any([`Gib mir einen Satz mit „${w.de}“.`, `Ein Beispielsatz mit ${w.ar}, bitte.`, `Wie benutze ich ${w.tr} in einem Satz?`]) },
    { a: { ar: s.ar, tr: s.tr, de: s.de, q: "Lies den Satz laut. Kannst du einen ähnlichen Satz bilden?" } }]));
}

// mischen und 5 % als Prüfmenge abtrennen
for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
const nEval = Math.max(10, Math.round(out.length * 0.05));
fs.writeFileSync(here + "eval.jsonl", out.slice(0, nEval).map(x => JSON.stringify(x)).join("\n") + "\n");
fs.writeFileSync(here + "train.jsonl", out.slice(nEval).map(x => JSON.stringify(x)).join("\n") + "\n");
console.log(`train.jsonl: ${out.length - nEval} Gespräche, eval.jsonl: ${nEval}`);
