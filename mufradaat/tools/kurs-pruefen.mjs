// Prüft die Kursdateien in kurs/: Aufbau, eindeutige IDs, bekannte Buchstaben, Audio und Offline-Liste.
// Aufruf: node tools/kurs-pruefen.mjs   (Rückgabewert 1, wenn etwas nicht stimmt)
// Aufbau: kurs/kurs.json listet Stufen und Etappen (id, titel, ar, kurz, datei). Etappen ohne „datei“ erscheinen als „Demnächst“.
// Eine Etappen-Datei (z. B. kurs/s1.json) hat id, lektionen[] und ziel{art,text,geschafft}. Jede Lektion hat id, titel, art,
// tipp{titel,text,zeichen} und optional station (arabischer Text auf der Station im Pfad). Je nach Art:
//   buchstaben: neu[] = Buchstaben, die die Lektion einführt
//   verbinden:  neu[] = Buchstaben, deren verbundene Formen die Lektion einführt (darf leer sein), woerter[] = Wörter ohne Vokalzeichen,
//               die nur Buchstaben mit schon eingeführten Formen enthalten
//   suren:      suren[] = {t: Surenanfang, sp: Text zum Vorlesen, vorstellen: true bei den vorgestellten}
//   vokale:     zeichen = das neue Zeichen der Lektion (a, i, u = Fatha, Kasra, Damma; hamza = Hamza auf Alif; an, in, un = Tanwin;
//               ta = Ta marbuta; aa, ii, uu = langes ā, ī, ū; kl = kleines Alif und ى; dip = aw und ay; o = Sukun; al = Artikel al-;
//               hz = Hamza auf Wāw, Yāʾ oder allein; sh = Schadda; sun = Sonnenbuchstaben), fehlt bei reinen Übungslektionen.
//               woerter[] = [Wort oder kurzer Satz mit allen Vokalzeichen, Bedeutung]. Jeder Buchstabe trägt genau ein schon
//               eingeführtes Zeichen (Vokal, Tanwin oder Sukun, dazu vielleicht Schadda), in der Unicode-Normalform (Vokal vor Schadda).
//               Ohne eigenes Zeichen stehen nur: Alif, Yāʾ und Wāw als Dehnung nach Fatha, Kasra und Damma, ى am Wortende,
//               das stumme Alif nach -an (nicht nach ة und Hamza) und der Artikel ال am Wortanfang (mit Sukun auf dem Lām, vor
//               Sonnenbuchstaben ohne, dann mit Schadda auf dem nächsten Buchstaben). Tanwin nur am Wortende und nie mit Artikel.
// Ziele: alle-buchstaben (alle 29 eingeführt) oder lesen {ar, sp, de}: ein Text, den man am Ende der Etappe lesen kann
// (de = Übersetzung, nur bei Texten mit Vokalzeichen; die Umschrift erzeugt die App).
// Neue Etappen-Dateien gehören auch in die Offline-Liste SHELL in sw.js.
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
const APP=fileURLToPath(new URL("..",import.meta.url)),KURS=APP+"kurs/";
const ARTEN=["buchstaben","verbinden","suren","vokale"],ZIELE=["alle-buchstaben","lesen"];
const ZEICHEN_ARTEN=["a","i","u","hamza","an","in","un","ta","aa","ii","uu","kl","dip","o","al","hz","sh","sun"],TANW=["an","in","un"],VZ={"\u064e":"a","\u0650":"i","\u064f":"u","\u064b":"an","\u064d":"in","\u064c":"un"};
const AR=/^[؀-ۿݐ-ݿ ]+$/; // nur arabische Zeichen und Leerzeichen
const MK=/[\u064b-\u0652\u0670]/,SONNE=new Set(["ta","tha","dal","dhal","ra","zay","sin","shin","sad","dad","tah","zah","lam","nun"]); // Zeichen über und unter Buchstaben; Sonnenbuchstaben
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
  const zk=new Map(); // eingeführte Zeichen → Lektion
  const einheiten=w=>{ // ein Wort in Silben wie in der App: Buchstabe mit Zeichen, Dehnungsbuchstabe, stummes Alif nach -an, Artikel (wl = Alif, sil = stummes Lām)
    const ch=[...w],U=[];
    for(let k=0;k<ch.length;k++){
      const c=ch[k],u=U[U.length-1],bare=!MK.test(ch[k+1]||"");
      if(c==="\u0651"){if(!u||u.wl||u.sil||u.sh||u.m)return{err:"Schadda an falscher Stelle"};u.sh=true}
      else if(VZ[c]||c==="\u0652"||c==="\u0670"){if(!u||u.wl||u.sil||u.v||u.o||u.m)return{err:"zwei Zeichen auf einem Buchstaben oder ein Zeichen an falscher Stelle"};
        if(c==="\u0652")u.o=true;else if(c==="\u0670"){u.v="aa";u.m=c}else u.v=VZ[c]}
      else if(c==="ا"&&u&&u.v==="an"&&!u.x&&bare)u.x=true;
      else if(bare&&u&&!u.m&&!u.x&&(u.v==="a"&&(c==="ا"||c==="ى")||u.v==="i"&&c==="ي"||u.v==="u"&&c==="و")){u.v+=u.v;u.m=c}
      else if(c==="ا"&&!U.length&&ch[k+1]==="ل"&&bare)U.push({c,wl:true});
      else if(c==="ل"&&u&&u.wl&&bare)U.push({c,sil:true,art:true});
      else{const a=AC[c]||("أإؤئ".includes(c)?AB.hamza:c==="ة"?["tam","ة","Tāʾ marbūṭa"]:null);
        if(!a)return{err:`„${c}“ ist hier kein Buchstabe oder steht an falscher Stelle`};U.push({c,a,v:"",art:!!(u&&u.wl)})}
    }
    return{U};
  };
  const traegt=(U,z)=>U.some((u,k)=>{const p=U[k-1]||{}; // trägt das Wort das Zeichen z? (wie kUZ in der App)
    return z==="ta"?u.c==="ة":z==="hamza"?"أإ".includes(u.c):z==="hz"?!!u.a&&u.a[0]==="hamza"&&k>0&&!p.art:z==="kl"?u.m==="ى"||u.m==="\u0670"
      :z==="dip"?!!u.o&&"وي".includes(u.c)&&p.v==="a":z==="o"?!!u.o:z==="al"?!!u.wl:z==="sh"?!!u.sh:z==="sun"?!!u.sil:u.v===z&&(z!=="aa"||u.m==="ا")});
  const vokal=(t,lw,was)=>{ // Text mit Vokalzeichen: jeder Buchstabe trägt ein schon eingeführtes Zeichen; liefert die Silben jedes Wortes
    if(!txt(t)||!AR.test(t)){f(`${lw}: ${was} „${t}“ ist kein arabischer Text`);return null}
    const F=m=>f(`${lw}: ${was} „${t}“${m}`),hat=z=>zk.has(z),out=[];
    if(t!==t.normalize("NFC")){F(": Zeichen nicht in Unicode-Reihenfolge (Vokal vor Schadda)");return null}
    for(const w of t.split(" ")){
      if(!w){F(": doppeltes Leerzeichen oder Leerzeichen am Rand");return null}
      const {U,err}=einheiten(w);if(err){F(": "+err);return null}
      for(let k=0;k<U.length;k++){const u=U[k],p=U[k-1],n=U[k+1];
        if(u.wl){if(!hat("al")){F(": der Artikel al- ist noch nicht eingeführt");return null}continue}
        if(u.sil){if(!hat("sun")){F(": Sonnenbuchstaben sind noch nicht eingeführt");return null}
          if(!n||!n.a||!SONNE.has(n.a[0])||!n.sh){F(": nach dem stummen Lām folgt ein Sonnenbuchstabe mit Schadda");return null}continue}
        const a=u.a,c=u.c,tm=c==="ة",hz=c==="أ"||c==="إ";
        if(a[0]==="alif"){F(": ein Alif ohne Zeichen steht nur nach -an, als langes ā oder im Artikel");return null}
        if(hz&&!hat("hamza")||tm&&!hat("ta")||"ؤئء".includes(c)&&!hat("hz")){F(` enthält ${c}, das noch nicht eingeführt ist`);return null}
        if(!hz&&!tm&&a[0]!=="hamza"&&!formen.has(a[0]))F(` enthält ${a[2]}, dessen verbundene Formen noch nicht eingeführt sind`);
        if(!u.v&&!u.o){F(`: ${c} hat kein Vokalzeichen`);return null}
        const nz=u.m==="ى"||u.m==="\u0670"?"kl":u.v;
        if(u.v&&!hat(nz)){F(` nutzt ${nz}, das noch nicht eingeführt ist`);return null}
        if(u.o){
          if(!k){F(": Sukun steht nie auf dem ersten Buchstaben");return null}
          if(p.o){F(": zwei Sukun hintereinander");return null}
          if(!u.art&&!hat("o")&&!(hat("dip")&&"وي".includes(c)&&p.v==="a")){F(": Sukun ist hier noch nicht eingeführt");return null}}
        if(u.art&&!u.o){F(": das Lām des Artikels trägt Sukun");return null}
        if(u.art&&n&&n.a&&SONNE.has(n.a[0])){F(": vor einem Sonnenbuchstaben trägt das Lām kein Sukun, der Buchstabe danach eine Schadda");return null}
        if(u.sh){if(!hat("sh")){F(": Schadda ist noch nicht eingeführt");return null}if(!k||p.o){F(": Schadda steht nicht auf dem ersten Buchstaben und nicht nach Sukun");return null}}
        const iv=["i","in","ii"].includes(u.v);
        if(c==="إ"&&!iv||c==="أ"&&iv)F(": Hamza mit Kasra steht unter dem Alif (إ), sonst darüber (أ)");
        if(u.m==="ى"&&n){F(": ى steht nur am Wortende");return null}
        if(tm){if(n){F(": ة steht nur am Wortende");return null}
          if(!TANW.includes(u.v)&&!(hat("al")&&["a","i","u"].includes(u.v))){F(hat("al")?": ة steht mit Tanwin oder einem kurzen Vokal":": ة steht hier nur mit Tanwin");return null}}
        if(TANW.includes(u.v)){
          if(n){F(": Tanwin steht nur am Wortende");return null}
          if(U[0].wl){F(": mit Artikel steht kein Tanwin");return null}
          if(u.v==="an"&&!u.x&&!"ةأء".includes(c)){F(": nach -an fehlt das stumme Alif");return null}
          if(u.x&&"ةأء".includes(c)){F(`: nach ${c} steht kein stummes Alif`);return null}}
      }
      out.push(U);
    }
    return out;
  };
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
        if(l.art==="vokale"){
          if(l.zeichen!==undefined){
            if(!ZEICHEN_ARTEN.includes(l.zeichen))f(`${lw}: unbekanntes Zeichen „${l.zeichen}“`);
            else if(zk.has(l.zeichen))f(`${lw}: Zeichen „${l.zeichen}“ wurde schon in ${zk.get(l.zeichen)} eingeführt`);else zk.set(l.zeichen,l.id);
          }
          if(!Array.isArray(l.woerter)||l.woerter.length<8)f(`${lw}: mindestens 8 Wörter nötig`);
          const W=(l.woerter||[]).map(x=>Array.isArray(x)?x[0]:x);
          if(new Set(W).size!==W.length)f(`${lw}: ein Wort steht doppelt in der Liste`);
          let mit=0;
          for(const x of l.woerter||[]){if(!Array.isArray(x)||x.length!==2||!txt(x[1])){f(`${lw}: „${x}“ braucht die Form [Wort, Bedeutung]`);continue}
            const r=vokal(x[0],lw,"Wort");if(r&&ZEICHEN_ARTEN.includes(l.zeichen)&&r.some(U=>traegt(U,l.zeichen)))mit++}
          if(ZEICHEN_ARTEN.includes(l.zeichen)&&mit<W.length/2)f(`${lw}: weniger als die Hälfte der Wörter nutzt das neue Zeichen`);
          if(l.station!==undefined&&txt(l.station))vokal(l.station,lw,"Station");
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
        if(d.ziel.art==="lesen"&&d.ziel.de!==undefined){vokal(d.ziel.ar,wo+", Ziel","Zieltext");if(!txt(d.ziel.de))f(`${wo}: Ziel ohne Übersetzung`)}
        else if(d.ziel.art==="lesen")buchst(d.ziel.ar,wo+", Ziel","Zieltext",true);
        if(d.ziel.art==="lesen"){if(!txt(d.ziel.sp)||!AR.test(d.ziel.sp))f(`${wo}: Ziel ohne arabischen Vorlesetext`)}
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
