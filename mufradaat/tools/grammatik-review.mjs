// Erzeugt die Prüfliste der Grammatik-Tipps und Ziele von Stufe 2 für Muttersprachler: node tools/grammatik-review.mjs > tools/grammatik-pruefen.md
import fs from "node:fs";
const K=new URL("../kurs/",import.meta.url).pathname,idx=JSON.parse(fs.readFileSync(K+"kurs.json","utf8"));
const st=idx.stufen.find(s=>s.id===2),out=[],cell=s=>String(s).replace(/\|/g,"\\|");
out.push("# Grammatik-Tipps zum Gegenlesen (Stufe 2)\n");
out.push("Die Wörter und Sätze von Stufe 2 kommen aus der Wortliste und der Satzliste der App (siehe `saetze-pruefen.md`). Neu sind nur diese Tipps und die Ziele der Etappen. Bitte jede Zeile prüfen und Korrekturen als Liste zurückschicken (Nummer + richtige Fassung).\n");
out.push("**Worauf es ankommt**\n");
out.push("1. Stimmt die Regel so, wie sie auf Deutsch erklärt ist, für Hocharabisch (Fusha)?");
out.push("2. Stimmen die arabischen Beispiele samt Vokalzeichen?");
out.push("3. Ist die Erklärung für Anfänger verständlich und nicht zu vereinfacht?\n");
out.push("| Nr. | Etappe · Lektion | Titel | Beispiel | Text |\n| --- | --- | --- | --- | --- |");
let n=0;
for(const e of st.etappen.filter(e=>e.datei)){const d=JSON.parse(fs.readFileSync(K+e.datei,"utf8"));
  for(const l of d.lektionen)if(l.tipp)out.push(`| ${++n} | ${e.id.toUpperCase()} · ${cell(l.titel)} | ${cell(l.tipp.titel)} | ${cell(l.tipp.zeichen)} | ${cell(l.tipp.text)} |`)}
out.push("\n## Ziele der Etappen\n");
out.push("| Etappe | Arabisch | Umschrift | Deutsch |\n| --- | --- | --- | --- |");
for(const e of st.etappen.filter(e=>e.datei)){const z=JSON.parse(fs.readFileSync(K+e.datei,"utf8")).ziel;if(z&&z.art==="lesen")out.push(`| ${e.id.toUpperCase()} · ${cell(e.titel)} | ${z.ar} | ${cell(z.tr||"")} | ${cell(z.de||"")} |`)}
console.log(out.join("\n"));
