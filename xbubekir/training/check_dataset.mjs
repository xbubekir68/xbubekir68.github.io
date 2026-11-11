// Prüft train.jsonl und eval.jsonl: node xbubekir/training/check_dataset.mjs
import fs from "node:fs";
import {createHash} from "node:crypto";
import {dialogueKey} from "./split_dataset.mjs";
const here = new URL(".", import.meta.url).pathname;
const HAR = /[ً-ْ]/, AR = /[؀-ۿ]/;
let n = 0, err = 0;
const rows={};
for (const f of ["train.jsonl", "eval.jsonl"]) for (const [i, line] of fs.readFileSync(here + f, "utf8").trim().split("\n").entries()) {
  const bad = m => { err++; console.error(`${f}:${i + 1}: ${m}`); };
  const row=JSON.parse(line), { messages: m }=row; n++;
  (rows[f]??=[]).push(row);
  if (m[0]?.role !== "system") bad("beginnt nicht mit system");
  m.slice(1).forEach((x, k) => { if (x.role !== (k % 2 ? "assistant" : "user")) bad(`Rolle ${k + 1} ist ${x.role}`); if (!x.content?.trim()) bad(`leerer Text in Nachricht ${k + 1}`); });
  if (m.at(-1).role !== "assistant") bad("endet nicht mit assistant");
  if (m[0].content.includes("Übungspartner")) for (const x of m.filter(x => x.role === "assistant")) {
    const first = x.content.split("\n")[0];
    if (!/^\*\*.+\*\*$/.test(first) || !AR.test(first)) bad(`Übungsantwort ohne fette arabische erste Zeile: ${first}`);
    else if (!HAR.test(first)) bad(`arabische Zeile ohne Harakat: ${first}`);
  }
}
const trainKeys=new Set(rows["train.jsonl"].map(dialogueKey));
const evalKeys=rows["eval.jsonl"].map(dialogueKey);
for(const key of evalKeys)if(trainKeys.has(key)){err++;console.error("Prüfgespräch auch im Training");}
if(new Set(evalKeys).size!==evalKeys.length){err++;console.error("Doppelte Prüfgespräche");}
const manifest=JSON.parse(fs.readFileSync(here+"split-manifest.json","utf8"));
const trainGroups=new Set(manifest.train.map(r=>r.group));
if(manifest.eval.some(r=>trainGroups.has(r.group))){err++;console.error("Eine Gruppe steht in Training und Prüfung");}
for(const [key,file] of [["train","train.jsonl"],["eval","eval.jsonl"]]){
  if(manifest[key].length!==rows[file].length){err++;console.error("Manifest-Länge falsch: "+file);}
  rows[file].forEach((r,i)=>{if(createHash("sha256").update(dialogueKey(r)).digest("hex")!==manifest[key][i]?.hash){err++;console.error("Manifest passt nicht: "+file+":"+(i+1));}});
}
const persona=JSON.parse(fs.readFileSync(here+"persona.json","utf8"));
const app=fs.readFileSync(here+"../app.js","utf8");
if(!app.includes(JSON.stringify(persona.system))){err++;console.error("Browser- und Trainings-Prompt weichen voneinander ab");}
console.log(`${n} Gespräche geprüft, ${err} Fehler`);
process.exit(err ? 1 : 0);
