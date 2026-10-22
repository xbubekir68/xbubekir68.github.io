// Erzeugt die Prüfliste der Sätze für Muttersprachler: node tools/sentences-review.mjs > tools/saetze-pruefen.md
import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync(new URL("../index.html",import.meta.url).pathname,"utf8");
const pick=n=>vm.runInNewContext(html.match(new RegExp("const "+n+"=(\\[[\\s\\S]*?\\n?\\]);\\s*\\n"))[1]);
const S=pick("SENT_RAW"),W=Object.fromEntries(pick("W_RAW").map(r=>[r[0],r]));
const out=[];
out.push("# Sätze zum Gegenlesen\n");
out.push(`${S.length} Sätze aus der App Mufradaat. Bitte jede Zeile prüfen und Korrekturen als Liste zurückschicken (Nummer + richtige Form).\n`);
out.push("**Worauf es ankommt**\n");
out.push("1. Ist der Satz richtiges Hocharabisch (Fusha) und klingt natürlich?");
out.push("2. Stimmen die Vokalzeichen (Harakat) in jedem Wort?");
out.push("3. Stimmt die Übereinstimmung von Geschlecht und Zahl (z. B. *al-madrasah kabīrah*)?");
out.push("4. Stimmen die **Endungen** (Kasus und Tanwin, z. B. *al-kitābu kabīrun*, *qaraʾa ṭ-ṭālibu l-kitāba*)?");
out.push("5. Gefällt die deutsche Übersetzung?\n");
out.push("| Nr. | Arabisch | Umschrift | Deutsch | Wörter |\n| --- | --- | --- | --- | --- |");
S.forEach((r,n)=>{const toks=r[2].split(" ").map(x=>x.split("|")),ar=toks.map(x=>x[0]).join(" ")+(r[3]?" ؟":" ."),ids=[...new Set(toks.map(x=>x[1]))].map(i=>W[i]?W[i][3]:i).join(", ");
  out.push(`| ${n+1} | ${ar} | ${r[1]} | ${r[0]} | ${ids} |`)});
console.log(out.join("\n"));
