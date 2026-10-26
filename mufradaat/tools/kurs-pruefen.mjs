// Prüft die Kursdateien in kurs/: Aufbau, eindeutige IDs, bekannte Buchstaben, Audio und Offline-Liste.
// Aufruf: node tools/kurs-pruefen.mjs   (Rückgabewert 1, wenn etwas nicht stimmt)
// Aufbau: kurs/kurs.json listet Stufen und Etappen (id, titel, ar, kurz, datei). Etappen ohne „datei“ erscheinen als „Demnächst“.
// Eine Etappen-Datei (z. B. kurs/s1.json) hat id, lektionen[] (id, titel, art, neu[], tipp{titel,text,zeichen}) und ziel{art,text}.
// Neue Etappen-Dateien gehören auch in die Offline-Liste SHELL in sw.js.
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
const APP=fileURLToPath(new URL("..",import.meta.url)),KURS=APP+"kurs/";
const ARTEN=["buchstaben"],ZIELE=["alle-buchstaben"];
const AR=/^[؀-ۿݐ-ݿ ]+$/; // nur arabische Zeichen und Leerzeichen
const txt=v=>typeof v==="string"&&v.trim().length>0;

export function pruefen(){
  const fehler=[],f=m=>fehler.push(m),html=fs.readFileSync(APP+"index.html","utf8"),sw=fs.readFileSync(APP+"sw.js","utf8");
  const ALPHA=vm.runInNewContext(html.match(/const ALPHA=(\[[\s\S]*?\n\])\.map/)[1]),AB=Object.fromEntries(ALPHA.map(a=>[a[0],a]));
  const audio=JSON.parse(fs.readFileSync(APP+"audio/audio.json","utf8")).items;
  const shell=vm.runInNewContext("("+sw.match(/SHELL=(\[[^\]]*\])/)[1]+")");
  const lies=(n,wo)=>{try{return JSON.parse(fs.readFileSync(KURS+n,"utf8"))}catch(e){f(`${wo}: ${n} fehlt oder ist kein gültiges JSON (${e.message})`);return null}};
  const idx=lies("kurs.json","Übersicht");if(!idx)return{fehler,etappen:0,lektionen:0};
  if(!Array.isArray(idx.stufen)||!idx.stufen.length)f("kurs.json: keine Stufen");
  const eIds=new Set(),lIds=new Set(),dateien=new Set(["kurs.json"]),eingef=new Map();let ne=0,nl=0;
  for(const st of idx.stufen||[]){
    if(!txt(st.titel)||!txt(st.ar))f(`Stufe ${st.id}: Titel oder arabischer Titel fehlt`);
    if(txt(st.ar)&&!AR.test(st.ar))f(`Stufe ${st.id}: arabischer Titel enthält andere Zeichen`);
    for(const e of st.etappen||[]){
      const wo="Etappe "+e.id;
      if(!/^[a-z0-9]+$/.test(e.id||""))f(`${wo}: ungültige ID`);
      if(eIds.has(e.id))f(`${wo}: ID doppelt`);eIds.add(e.id);
      if(!txt(e.titel)||!txt(e.ar)||!txt(e.kurz))f(`${wo}: Titel, arabischer Titel oder Kurzbeschreibung fehlt`);
      if(txt(e.ar)&&!AR.test(e.ar))f(`${wo}: arabischer Titel enthält andere Zeichen`);
      if(!e.datei)continue;
      dateien.add(e.datei);ne++;
      if(!shell.includes("kurs/"+e.datei))f(`${wo}: kurs/${e.datei} fehlt in der Offline-Liste (SHELL in sw.js)`);
      const d=lies(e.datei,wo);if(!d)continue;
      if(d.id!==e.id)f(`${wo}: Datei ${e.datei} trägt die ID ${d.id}`);
      if(!Array.isArray(d.lektionen)||!d.lektionen.length){f(`${wo}: keine Lektionen`);continue}
      for(const l of d.lektionen){
        const lw=`${wo}, Lektion ${l.id}`;nl++;
        if(lIds.has(l.id))f(`${lw}: ID doppelt`);lIds.add(l.id);
        if(!String(l.id).startsWith(e.id+"-"))f(`${lw}: ID beginnt nicht mit „${e.id}-“`);
        if(!txt(l.titel))f(`${lw}: Titel fehlt`);
        if(!ARTEN.includes(l.art))f(`${lw}: unbekannte Art „${l.art}“`);
        if(l.art==="buchstaben"){
          if(!Array.isArray(l.neu)||!l.neu.length)f(`${lw}: keine neuen Buchstaben`);
          for(const i of l.neu||[]){
            if(!AB[i]){f(`${lw}: unbekannter Buchstabe „${i}“`);continue}
            if(eingef.has(i))f(`${lw}: „${i}“ wurde schon in ${eingef.get(i)} eingeführt`);else eingef.set(i,l.id);
            if(!audio[AB[i][4]])f(`${lw}: kein Audio für den Namen von „${i}“ (${AB[i][4]})`);
          }
        }
        if(l.tipp){
          if(!txt(l.tipp.titel)||!txt(l.tipp.text)||!txt(l.tipp.zeichen))f(`${lw}: Tipp unvollständig`);
          else if(!AR.test(l.tipp.zeichen))f(`${lw}: Tipp-Zeichen enthalten andere Zeichen`);
        }
      }
      if(d.ziel){
        if(!ZIELE.includes(d.ziel.art)||!txt(d.ziel.text))f(`${wo}: Ziel unvollständig oder unbekannt`);
        if(d.ziel.art==="alle-buchstaben"){const fehlt=ALPHA.filter(a=>!eingef.has(a[0])).map(a=>a[0]);if(fehlt.length)f(`${wo}: Ziel „alle Buchstaben“, aber es fehlen ${fehlt.join(", ")}`)}
      }
    }
  }
  for(const n of fs.readdirSync(KURS))if(n.endsWith(".json")&&!dateien.has(n))f(`kurs/${n} wird in kurs.json nicht genannt`);
  return{fehler,etappen:ne,lektionen:nl};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1])){
  const r=pruefen();
  console.log(`${r.etappen} Etappen mit Inhalt, ${r.lektionen} Lektionen`);
  r.fehler.forEach(m=>console.log("FEHLER "+m));
  console.log(r.fehler.length?r.fehler.length+" Fehler":"Alles in Ordnung");
  process.exit(r.fehler.length?1:0);
}
