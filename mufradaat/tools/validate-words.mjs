// Prüft die Wortdaten in index.html. Aufruf: node tools/validate-words.mjs [pfad/zu/index.html]
import fs from "node:fs";
import vm from "node:vm";
const file=process.argv[2]||new URL("../index.html",import.meta.url).pathname;
const html=fs.readFileSync(file,"utf8");
const pick=n=>{const m=html.match(new RegExp("const "+n+"=(\\[[\\s\\S]*?\\n?\\]);\\s*\\n"));if(!m)throw new Error(n+" nicht gefunden");return vm.runInNewContext(m[1])};
const W=pick("W_RAW"),L=pick("LES_RAW");
const cpm=html.match(/const CP=new Set\((\[\[[\s\S]*?\]\])\.flatMap/);const CPP=cpm?vm.runInNewContext(cpm[1]):[];
const err=[],warn=[];const E=m=>err.push(m),Wn=m=>warn.push(m);
const DIAC=/[ً-ْٰ]/,AR=/^[؀-ۿݐ-ݿ‌‍\s]+$/,TR=/^[A-Za-zāīūḥṣḍṭẓʿʾʻ’'‘ġḡšẖ\- ()?!.,\/]+$/;
const ids=new Map(),arSeen=new Map(),deSeen=new Map();
W.forEach((r,n)=>{const row=`Zeile ${n+1}`;
  if(!Array.isArray(r)||r.length<4){E(`${row}: weniger als 4 Felder`);return}
  const [id,ar,tr,de]=r;
  if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))E(`${row} (${id}): ID nur a-z, 0-9 und Bindestrich`);
  if(ids.has(id))E(`${row}: ID „${id}“ doppelt (auch Zeile ${ids.get(id)})`);ids.set(id,n+1);
  if(!ar||!AR.test(ar))E(`${row} (${id}): arabischer Text fehlt oder enthält fremde Zeichen`);
  else if(!DIAC.test(ar))Wn(`${row} (${id}): keine Vokalzeichen in „${ar}“`);
  if(!tr||!TR.test(tr))Wn(`${row} (${id}): Umschrift „${tr}“ enthält ungewöhnliche Zeichen`);
  if(!de||de!==de.trim())E(`${row} (${id}): deutsche Bedeutung leer oder mit Leerzeichen am Rand`);
  if(/\s{2,}/.test(ar+tr+de))Wn(`${row} (${id}): doppelte Leerzeichen`);
  const k=ar.replace(DIAC,"");if(arSeen.has(k))Wn(`${row} (${id}): gleicher arabischer Text wie ${arSeen.get(k)}`);else arSeen.set(k,id);
  const g=de.toLowerCase();if(deSeen.has(g))Wn(`${row} (${id}): gleiche deutsche Bedeutung wie ${deSeen.get(g)}`);else deSeen.set(g,id);
});
const used=new Map();
L.forEach((l,k)=>{const [t,g,w]=l;
  if(!t||!g)E(`Lektion ${k+1}: Titel oder Gruppe fehlt`);
  if(w.length<4||w.length>12)Wn(`Lektion ${k+1} „${t}“: ${w.length} Wörter (üblich 4 bis 12)`);
  w.forEach(id=>{if(!ids.has(id))E(`Lektion ${k+1} „${t}“: unbekannte ID „${id}“`);if(used.has(id))E(`Lektion ${k+1}: „${id}“ steht schon in Lektion ${used.get(id)}`);used.set(id,k+1)});
});
for(const id of ids.keys())if(!used.has(id))Wn(`„${id}“ gehört zu keiner Lektion`);
CPP.forEach(([a,b])=>{for(const x of [a,b])if(!ids.has(x))E(`Konfliktpaar: unbekannte ID „${x}“`)});
// Genus- und Plural-Tabellen: nur bekannte IDs, Plural mit Vokalzeichen, kein Wort in beiden Genus-Listen
const setOf=n=>{const m=html.match(new RegExp("const "+n+'=new Set\\("([^"]+)"'));return m?m[1].split(" "):[]};
const GF=setOf("GEN_F"),GM=setOf("GEN_M");
for(const id of [...GF,...GM])if(!ids.has(id))E(`Genus-Liste: unbekannte ID „${id}“`);
for(const id of GF)if(GM.includes(id))E(`„${id}“ steht in beiden Genus-Listen`);
const plm=html.match(/const PL=(\{[\s\S]*?\});\s*\nconst genOf/);const PLS=plm?vm.runInNewContext("("+plm[1]+")"):{};
for(const [id,[ar,tr]] of Object.entries(PLS)){if(!ids.has(id))E(`Plural-Tabelle: unbekannte ID „${id}“`);if(!DIAC.test(ar))Wn(`Plural von „${id}“ ohne Vokalzeichen`);if(!TR.test(tr))Wn(`Plural-Umschrift von „${id}“ ungewöhnlich: ${tr}`)}

// Sätze: nur bekannte Wörter, Vokalzeichen, Satzzeichen, Artikel passend zum Anfangsbuchstaben, keine Doppelten
const SR=pick("SENT_RAW");const SF=setOf("SFREE");
const SOLAR=new Set("تثدذرزسشصضطظلن"),stripD=t=>t.replace(DIAC,"");
const sAr=new Map(),sDe=new Map();let sQ=0;
SR.forEach((r,n)=>{const row=`Satz ${n+1}`;
  if(!Array.isArray(r)||r.length<3){E(`${row}: weniger als 3 Felder`);return}
  const [de,tr,toks,q]=r,t=toks.split(" ");
  if(!de||!/[.?!]$/.test(de))E(`${row}: deutscher Satz fehlt oder endet ohne Satzzeichen`);
  if(!!q!==/\?$/.test(de))E(`${row}: Frage-Kennzeichen passt nicht zum deutschen Satz („${de}“)`);
  if(q)sQ++;
  if(!tr||!TR.test(tr))Wn(`${row}: Umschrift „${tr}“ ungewöhnlich`);
  if(t.length<2||t.length>7)Wn(`${row}: ${t.length} Wörter (üblich 2 bis 7)`);
  const ar=[];
  t.forEach(x=>{const [a,id]=x.split("|");
    if(!a||!id){E(`${row}: Block „${x}“ braucht Form arabisch|id`);return}
    if(!ids.has(id))E(`${row}: unbekannte Wort-ID „${id}“`);
    if(!AR.test(a))E(`${row}: „${a}“ enthält fremde Zeichen`);
    else if(!DIAC.test(a))Wn(`${row}: „${a}“ ohne Vokalzeichen`);
    ar.push(a);
    if(!/[ً-ْٰاىيو]$/.test(a))Wn(`${row}: „${a}“ endet ohne Vokalzeichen (Endung fehlt?)`);
    if(a.startsWith("ال")){const base=stripD(a).slice(2,3),sol=SOLAR.has(base),sukun=a.startsWith("الْ");
      if(sol&&sukun)Wn(`${row}: „${a}“ – vor Sonnenbuchstabe steht kein Sukun auf dem Lam`);
      if(!sol&&!sukun)Wn(`${row}: „${a}“ – vor Mondbuchstabe fehlt das Sukun auf dem Lam`)}
  });
  const k=stripD(ar.join(" "));if(sAr.has(k))Wn(`${row}: gleicher arabischer Satz wie ${sAr.get(k)}`);else sAr.set(k,n+1);
  if(sDe.has(de))Wn(`${row}: gleicher deutscher Satz wie ${sDe.get(de)}`);else sDe.set(de,n+1);
});
for(const id of SF)if(!ids.has(id))E(`SFREE: unbekannte ID „${id}“`);
// Kurs: jede Lektion steht genau einmal in einer Einheit; jede Einheit mit Sätzen bekommt mindestens 3
const um=html.match(/const UNITS=(\[[\s\S]*?\n\]);/);if(!um)throw new Error("UNITS nicht gefunden");
const UN=vm.runInNewContext(um[1]),titles=L.map(l=>l[0]),inUnit=new Map();
UN.forEach((u,ui)=>{if(!u.t||!u.d)E(`Einheit ${ui+1}: Titel oder Beschreibung fehlt`);u.l.forEach(t=>{if(!titles.includes(t))E(`Einheit ${ui+1} „${u.t}“: unbekannte Lektion „${t}“`);if(inUnit.has(t))E(`Lektion „${t}“ steht in mehreren Einheiten`);inUnit.set(t,ui)})});
for(const t of titles)if(!inUnit.has(t))E(`Lektion „${t}“ gehört zu keiner Einheit`);
const unitOfId=new Map();L.forEach(l=>l[2].forEach(id=>unitOfId.set(id,inUnit.get(l[0]))));
const su=SR.map(r=>Math.max(0,...r[2].split(" ").map(x=>x.split("|")[1]).filter(id=>!SF.includes(id)).map(id=>unitOfId.get(id)??0)));
let pend=0;const stat=[];UN.forEach((_,ui)=>{const n=pend+su.filter(u=>u===ui).length;if(n<3&&ui<UN.length-1){pend=n;return}pend=0;if(n)stat.push(`E${ui+1}: ${n}`)});
console.log(`${UN.length} Einheiten, Satzrunden: ${stat.join(", ")}`);
console.log(`${SR.length} Sätze (${sQ} Fragen) geprüft`);
console.log(`${GF.length} weibliche, ${GM.length} männliche Genus-Einträge, ${Object.keys(PLS).length} Plurale`);
console.log(`${W.length} Wörter, ${L.length} Lektionen, ${CPP.length} Konfliktpaare geprüft`);
warn.forEach(m=>console.log("Hinweis:",m));err.forEach(m=>console.log("FEHLER:",m));
console.log(`${err.length} Fehler, ${warn.length} Hinweise`);process.exit(err.length?1:0);
