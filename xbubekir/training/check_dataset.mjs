// Prüft train.jsonl und eval.jsonl: node xbubekir/training/check_dataset.mjs
import fs from "node:fs";
const here = new URL(".", import.meta.url).pathname;
const HAR = /[ً-ْ]/, AR = /[؀-ۿ]/;
let n = 0, err = 0;
for (const f of ["train.jsonl", "eval.jsonl"]) for (const [i, line] of fs.readFileSync(here + f, "utf8").trim().split("\n").entries()) {
  const bad = m => { err++; console.error(`${f}:${i + 1}: ${m}`); };
  const { messages: m } = JSON.parse(line); n++;
  if (m[0]?.role !== "system") bad("beginnt nicht mit system");
  m.slice(1).forEach((x, k) => { if (x.role !== (k % 2 ? "assistant" : "user")) bad(`Rolle ${k + 1} ist ${x.role}`); if (!x.content?.trim()) bad(`leerer Text in Nachricht ${k + 1}`); });
  if (m.at(-1).role !== "assistant") bad("endet nicht mit assistant");
  if (m[0].content.includes("Übungspartner")) for (const x of m.filter(x => x.role === "assistant")) {
    const first = x.content.split("\n")[0];
    if (!/^\*\*.+\*\*$/.test(first) || !AR.test(first)) bad(`Übungsantwort ohne fette arabische erste Zeile: ${first}`);
    else if (!HAR.test(first)) bad(`arabische Zeile ohne Harakat: ${first}`);
  }
}
console.log(`${n} Gespräche geprüft, ${err} Fehler`);
process.exit(err ? 1 : 0);
