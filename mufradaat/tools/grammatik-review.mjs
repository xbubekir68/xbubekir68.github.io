// Erzeugt die Prüfliste von Stufe 2 für Muttersprachler (Tipps, Ziele, Sätze, Mini-Dialoge, neue Wörter): node tools/grammatik-review.mjs > tools/grammatik-pruefen.md
import fs from "node:fs";
const K=new URL("../kurs/",import.meta.url).pathname,idx=JSON.parse(fs.readFileSync(K+"kurs.json","utf8"));
const st=idx.stufen.find(s=>s.id===2),out=[],cell=s=>String(s).replace(/\|/g,"\\|"),E=st.etappen.filter(e=>e.datei).map((e,k)=>({...e,n:k+1,d:JSON.parse(fs.readFileSync(K+e.datei,"utf8"))}));
out.push("# Stufe 2 zum Gegenlesen\n");
out.push("Alle Wörter, Sätze, Mini-Dialoge, Tipps und Ziele von Stufe 2, so wie sie in der App stehen. Der Inhaber hat sie vor dem Einbau gegengelesen; diese Liste ist für die Prüfung durch Muttersprachler. Bitte Korrekturen als Liste zurückschicken (Nummer + richtige Fassung).\n");
out.push("**Worauf es ankommt**\n");
out.push("1. Ist jeder Satz richtiges Hocharabisch (Fusha) und klingt er natürlich?");
out.push("2. Stimmen die Vokalzeichen, besonders die Endungen?");
out.push("3. Stimmen Umschrift und deutsche Übersetzung?");
out.push("4. Stimmt jede Regel so, wie sie auf Deutsch erklärt ist, und ist sie für Anfänger verständlich?\n");
for(const e of E){const d=e.d;
  out.push(`## Etappe ${e.n} · ${cell(e.titel)}\n`);
  if((d.woerter||[]).length){out.push("**Neue Wörter**\n\n| Arabisch | Umschrift | Deutsch |\n| --- | --- | --- |");for(const w of d.woerter)out.push(`| ${w.ar} | ${cell(w.tr)} | ${cell(w.de)} |`);out.push("")}
  out.push("**Tipps**\n\n| Nr. | Lektion | Titel | Beispiel | Text |\n| --- | --- | --- | --- | --- |");
  let n=0;for(const l of d.lektionen)if(l.tipp)out.push(`| ${++n} | ${cell(l.titel)} | ${cell(l.tipp.titel)} | ${cell(l.tipp.zeichen)} | ${cell(l.tipp.text)} |`);
  out.push("\n**Sätze**\n\n| Nr. | Arabisch | Umschrift | Deutsch |\n| --- | --- | --- | --- |");
  (d.saetze||[]).forEach((s,k)=>out.push(`| ${k+1} | ${s.ar} | ${cell(s.tr)} | ${cell(s.de)} |`));
  out.push("\n**Mini-Dialoge** (in der App wählt man die letzte Zeile; die zwei falschen Antworten stehen darunter)\n\n| Dialog | Wer | Arabisch | Deutsch |\n| --- | --- | --- | --- |");
  (d.dialoge||[]).forEach((x,k)=>{x.z.forEach(z=>out.push(`| ${k+1} | ${z[0]} | ${z[1]} | ${cell(z[2])} |`));out.push(`| ${k+1} | falsch | ${x.falsch.join(" / ")} | |`)});
  if(d.ziel&&d.ziel.art==="lesen")out.push(`\n**Ziel der Etappe:** ${d.ziel.ar} · ${cell(d.ziel.tr||"")} · ${cell(d.ziel.de||"")}`);
  out.push("");
}
console.log(out.join("\n"));
