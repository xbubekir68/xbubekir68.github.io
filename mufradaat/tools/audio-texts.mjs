// Alle Texte, die die App vorliest: Wörter, Sätze, Buchstabennamen und Beispielwörter.
// Liefert pro Text eine feste ID, unter der die Audiodatei abgelegt wird.
// Wörter: w/<wort-id>, Buchstaben: a/<buchstaben-id>, Sätze: s/<prüfsumme des Satzes>,
// Texte aus den Kursdateien (Surenanfänge, Ziele der Etappen): k/<prüfsumme des Textes>.
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
export const APP=fileURLToPath(new URL("..",import.meta.url));
const html=()=>fs.readFileSync(APP+"index.html","utf8");
const pick=(h,n)=>{const m=h.match(new RegExp("const "+n+"=(\\[[\\s\\S]*?\\n?\\]);\\s*\\n"));if(!m)throw new Error(n+" nicht in index.html gefunden");return vm.runInNewContext(m[1])};
// Kurze, stabile Prüfsumme (FNV-1a): ändert sich, wenn der Satz korrigiert wird
export const hash=t=>{let h=0x811c9dc5;for(const c of t){h^=c.codePointAt(0);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,"0")};
export function texts(){
  const h=html(),out=new Map(); // Text → Eintrag (gleiche Texte nur einmal)
  const add=(id,text,de)=>{if(!out.has(text))out.set(text,{id,text,de})};
  const W=pick(h,"W_RAW"),L=pick(h,"LES_RAW"),used=new Set(L.flatMap(l=>l[2]));
  for(const [id,ar,,de] of W)if(used.has(id))add("w/"+id,ar,de);
  const A=vm.runInNewContext(h.match(/const ALPHA=(\[[\s\S]*?\n\])\.map/)[1]);
  for(const a of A){add("a/"+a[0],a[4],"Buchstabe "+a[2]);add("a/"+a[0]+"-bsp",a[7],a[9])}
  for(const r of pick(h,"SENT_RAW")){const ar=r[2].split(" ").map(x=>x.split("|")[0]).join(" ");add("s/"+hash(ar),ar,r[0])}
  const K=APP+"kurs/",idx=JSON.parse(fs.readFileSync(K+"kurs.json","utf8"));
  for(const e of idx.stufen.flatMap(s=>s.etappen).filter(e=>e.datei)){
    const d=JSON.parse(fs.readFileSync(K+e.datei,"utf8"));
    for(const l of d.lektionen)for(const x of l.suren||[])add("k/"+hash(x.sp),x.sp,"Surenanfang "+x.t);
    if(d.ziel&&d.ziel.sp)add("k/"+hash(d.ziel.sp),d.ziel.sp,"Ziel der Etappe "+e.id.toUpperCase());
  }
  return [...out.values()];
}
