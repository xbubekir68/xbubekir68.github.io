// Prüft die Kursdateien in kurs/: Aufbau, eindeutige IDs, bekannte Buchstaben, Audio und Offline-Liste.
// Aufruf: node tools/kurs-pruefen.mjs   (Rückgabewert 1, wenn etwas nicht stimmt)
// Aufbau: kurs/kurs.json listet Stufen und Etappen (id, titel, ar, kurz, datei). Etappen ohne „datei“ erscheinen als „Demnächst“.
// Eine Etappen-Datei (z. B. kurs/s1.json) hat id, lektionen[] und ziel{art,text,geschafft}. Jede Lektion hat id, titel, art,
// tipp{titel,text,zeichen} und optional station (arabischer Text auf der Station im Pfad). Je nach Art:
//   buchstaben: neu[] = Buchstaben, die die Lektion einführt
//   verbinden:  neu[] = Buchstaben, deren verbundene Formen die Lektion einführt (darf leer sein), woerter[] = Wörter ohne Vokalzeichen,
//               die nur Buchstaben mit schon eingeführten Formen enthalten
//   suren:      suren[] = {t: Surenanfang, sp: Text zum Vorlesen, vorstellen: true bei den vorgestellten}
// Ziele: alle-buchstaben (alle 29 eingeführt) oder lesen {ar, sp}: ein Text, den man am Ende der Etappe lesen kann.
// Neue Etappen-Dateien gehören auch in die Offline-Liste SHELL in sw.js.
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
const APP=fileURLToPath(new URL("..",import.meta.url)),KURS=APP+"kurs/";
const ARTEN=["buchstaben","verbinden","suren"],ZIELE=["alle-buchstaben","lesen"];
const AR=/^[؀-ۿݐ-ݿ ]+$/; // nur arabische Zeichen und Leerzeichen
const txt=v=>typeof v==="string"&&v.trim().length>0;
const ZEICHEN=/[\u064b-\u065f\u0670\u0640 ]/g; // Vokal- und Lesezeichen, Dehnungsstrich, Leerzeichen

export function pruefen(){
  const fehler=[],f=m=>fehler.push(m),html=fs.readFileSync(APP+"index.html","utf8"),sw=fs.readFileSync(APP+"sw.js","utf8");
  const ALPHA=vm.runInNewContext(html.match(/const ALPHA=(\[[\s\S]*?\n\])\.map/)[1]),AB=Object.fromEntries(ALPHA.map(a=>[a[0],a]));
  const audio=JSON.parse(fs.readFileSync(APP+"audio/audio.json","utf8")).items;
  const shell=vm.runInNewContext("("+sw.match(/SHELL=(\[[^\]]*\])/)[1]+")");
  const lies=(n,wo)=>{try{return JSON.parse(fs.readFileSync(KURS+n,"utf8"))}catch(e){f(`${wo}: ${n} fehlt oder ist kein gültiges JSON (${e.message})`);return null}};
  const idx=lies("kurs.json","Übersicht");if(!idx)return{fehler,etappen:0,lektionen:0};
  if(!Array.isArray(idx.stufen)||!idx.stufen.length)f("kurs.json: keine Stufen");
  const eIds=new Set(),lIds=new Set(),dateien=new Set(["kurs.json"]),eingef=new Map(),formen=new Map();let ne=0,nl=0;
  const AC=Object.fromEntries(ALPHA.map(a=>[a[1],a]));
  const buchst=(t,lw,was,vokale)=>{ // Buchstaben eines arabischen Textes; meldet fremde Zeichen und Formen, die noch nicht dran waren
    if(!txt(t)||!AR.test(t)){f(`${lw}: ${was} „${t}“ ist kein arabischer Text`);return[]}
    if(!vokale&&/[\u064b-\u0652\u0670]/.test(t))f(`${lw}: ${was} „${t}“ hat Vokalzeichen, hier sind sie noch nicht dran`);
    const r=[];for(const c of t.replace(ZEICHEN,"")){const a=AC[c];if(!a){f(`${lw}: ${was} „${t}“ enthält „${c}“, das ist kein Buchstabe des Alphabets`);continue}
      if(!formen.has(a[0])&&a[0]!=="hamza")f(`${lw}: ${was} „${t}“ enthält ${a[2]}, dessen verbundene Formen noch nicht eingeführt sind`);r.push(a)}
    return r};
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
        if(l.art==="verbinden"){
          if(!Array.isArray(l.neu))f(`${lw}: „neu“ fehlt (leere Liste, wenn keine Formen neu sind)`);
          for(const i of l.neu||[]){
            if(!AB[i]){f(`${lw}: unbekannter Buchstabe „${i}“`);continue}
            if(!eingef.has(i))f(`${lw}: Formen von „${i}“ kommen, bevor der Buchstabe selbst eingeführt ist`);
            if(formen.has(i))f(`${lw}: Formen von „${i}“ wurden schon in ${formen.get(i)} eingeführt`);else formen.set(i,l.id);
          }
          if(!Array.isArray(l.woerter)||l.woerter.length<4)f(`${lw}: mindestens 4 Wörter nötig`);
          if(new Set(l.woerter||[]).size!==(l.woerter||[]).length)f(`${lw}: ein Wort steht doppelt in der Liste`);
          for(const w of l.woerter||[]){if(w.includes(" "))f(`${lw}: „${w}“ ist mehr als ein Wort`);buchst(w,lw,"Wort")}
        }
        if(l.art==="suren"){
          if(!Array.isArray(l.suren)||l.suren.length<4)f(`${lw}: mindestens 4 Surenanfänge nötig`);
          else if(l.suren.filter(x=>x.vorstellen).length<2)f(`${lw}: mindestens 2 Surenanfänge zum Vorstellen markieren`);
          for(const x of l.suren||[]){
            const L=buchst(x.t,lw,"Surenanfang");
            if(!txt(x.sp)||!AR.test(x.sp))f(`${lw}: „${x.t}“ ohne arabischen Vorlesetext`);
            else if(x.sp.trim().split(/ +/).length!==L.length)f(`${lw}: „${x.t}“ hat ${L.length} Buchstaben, der Vorlesetext aber ${x.sp.trim().split(/ +/).length} Namen`);
          }
          if(new Set((l.suren||[]).map(x=>x.t)).size!==(l.suren||[]).length)f(`${lw}: ein Surenanfang steht doppelt`);
        }
        if(l.station!==undefined&&(!txt(l.station)||!AR.test(l.station)))f(`${lw}: Station ist kein arabischer Text`);
        if(l.tipp){
          if(!txt(l.tipp.titel)||!txt(l.tipp.text)||!txt(l.tipp.zeichen))f(`${lw}: Tipp unvollständig`);
          else if(!AR.test(l.tipp.zeichen))f(`${lw}: Tipp-Zeichen enthalten andere Zeichen`);
        }
      }
      if(d.ziel){
        if(!ZIELE.includes(d.ziel.art)||!txt(d.ziel.text))f(`${wo}: Ziel unvollständig oder unbekannt`);
        if(d.ziel.geschafft!==undefined&&!txt(d.ziel.geschafft))f(`${wo}: Ziel-Text „geschafft“ ist leer`);
        if(d.ziel.art==="lesen"){buchst(d.ziel.ar,wo+", Ziel","Zieltext",true);if(!txt(d.ziel.sp)||!AR.test(d.ziel.sp))f(`${wo}: Ziel ohne arabischen Vorlesetext`)}
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
