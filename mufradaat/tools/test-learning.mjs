// Logik-Tests für das Lernsystem: adaptive Wiederholung, Gedächtnis-Pegel,
// Tages-Mischung und das Ausblenden der Vokalzeichen.
// Aufruf: node tools/test-learning.mjs   (ohne Browser, ohne Abhängigkeiten)
import fs from "node:fs";import vm from "node:vm";import path from "node:path";import {fileURLToPath} from "node:url";
const html=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),"..","index.html"),"utf8");
const m=html.match(/<script>([\s\S]*)<\/script>/);
let code=m[1].replace(/\nloadSb\(\)\.then[^\n]*\n[^\n]*serviceWorker[^\n]*\s*$/,"\n");
if(/loadSb\(\)/.test(code.split("\n").slice(-6).join("\n")))code=code.split("\n").filter(l=>!/^loadSb\(\)|serviceWorker/.test(l)).join("\n");
const store={},mk=()=>({innerHTML:"",style:{},querySelector:()=>null,scrollLeft:0,scrollWidth:0,clientWidth:0,offsetLeft:0,scrollIntoView(){},hidden:false,classList:{add(){},remove(){},toggle(){}},offsetWidth:0,parentNode:{classList:{toggle(){}}},dataset:{},set onclick(v){},set oninput(v){},set onkeydown(v){},click(){},focus(){},remove(){},appendChild(){},setAttribute(){},scrollIntoView(){},value:"",textContent:"",lastChild:{}});
const el=mk(),doc={querySelector:()=>el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk(),body:{appendChild(){}},documentElement:{removeAttribute(){},setAttribute(){}}};
const ctx={document:doc,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},sessionStorage:{getItem(){return null},setItem(){}},
 matchMedia:()=>({matches:true}),setTimeout:(f)=>0,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame(f){},console,Notification:{permission:"denied"},addEventListener(){},navigator:{},crypto:{},SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},scrollTo(){}};
ctx.window=ctx;vm.createContext(ctx);
const run=c=>vm.runInContext(c,ctx);
run(code);run(`U="gast";loadS();`);
let pass=0,fail=0;
const ok=(n,c,x)=>{c?pass++:fail++;console.log(c?"OK  ":"FAIL",n,c?"":"→ "+JSON.stringify(x))};
const near=(a,b,t)=>Math.abs(a-b)<=t;
const D=864e5;
console.log(run(`W.length+" Wörter, "+LES.length+" Lektionen, "+BADGES.length+" Abzeichen"`));

// ---------- 1. Adaptive Wiederholung ----------
run(`S.box={};S.due={};S.ef={};`);
run(`grade("kitab",true)`);
ok("neu + richtig → Box 1",run(`S.box.kitab`)===1,run(`S.box.kitab`));
ok("Faktor steigt auf 1.12",run(`efOf("kitab")`)===1.12,run(`efOf("kitab")`));
ok("Termin ≈ 1 Tag × 1.12",near(run(`S.due.kitab-Date.now()`),1.12*D,6e4),run(`(S.due.kitab-Date.now())/864e5`));
run(`S.due.kitab=Date.now()-1000;grade("kitab",true)`);
ok("fällig + richtig → Box 2 (gelernt)",run(`S.box.kitab===2&&isLearned("kitab")`));
ok("Faktor 1.24",run(`efOf("kitab")`)===1.24,run(`efOf("kitab")`));
ok("Termin ≈ 3 Tage × 1.24",near(run(`S.due.kitab-Date.now()`),3*1.24*D,6e4),run(`(S.due.kitab-Date.now())/864e5`));
const before=run(`S.box.kitab`);run(`grade("kitab",true)`);
ok("Üben vor der Zeit ändert Box und Faktor nicht",run(`S.box.kitab`)===before&&run(`efOf("kitab")`)===1.24);
run(`S.box.bayt=4;S.ef.bayt=1.5;S.due.bayt=Date.now()-1000;grade("bayt",false)`);
ok("falsch → Box 4 auf 2",run(`S.box.bayt`)===2,run(`S.box.bayt`));
ok("falsch → Faktor 1.25",run(`efOf("bayt")`)===1.25,run(`efOf("bayt")`));
ok("falsch → neuer Termin ≈ 3 Tage × 1.25",near(run(`S.due.bayt-Date.now()`),3*1.25*D,6e4),run(`(S.due.bayt-Date.now())/864e5`));
run(`S.box.qalam=3;S.ef.qalam=.7;S.due.qalam=Date.now()-1000;for(let i=0;i<5;i++)grade("qalam",false)`);
ok("Faktor fällt nie unter 0.6",run(`efOf("qalam")`)===.6,run(`efOf("qalam")`));
run(`S.box.bab=1;S.ef.bab=2.1;for(let i=0;i<6;i++){S.due.bab=Date.now()-1000;grade("bab",true)}`);
ok("Faktor steigt nie über 2.2",run(`efOf("bab")`)===2.2,run(`efOf("bab")`));
ok("Box steigt nie über MAXB",run(`S.box.bab===MAXB`),run(`S.box.bab`));
run(`S.box.shams=2;S.ef.shams=1;S.due.shams=Date.now()-10*864e5;grade("shams",true)`); // lange überfällig, trotzdem gewusst
ok("lange überfällig + gewusst → Faktor +0.2",run(`efOf("shams")`)===1.2,run(`efOf("shams")`));
ok("Faktor 1 wird nicht gespeichert",run(`(S.box.ma=0,setEf("ma",1),S.ef.ma===undefined)`));

// ---------- 2. Gedächtnis-Pegel ----------
run(`S.box.ras=3;S.ef.ras=1;S.due.ras=Date.now()+6*864e5`);
ok("Pegel frisch (viel Zeit übrig)",run(`mem("ras").k`)===3,run(`mem("ras")`));
run(`S.due.ras=Date.now()+2*864e5`);
ok("Pegel wackelig (weniger als 45 % übrig)",run(`mem("ras").k`)===2,run(`mem("ras")`));
run(`S.due.ras=Date.now()-1000`);
ok("Pegel fällig",run(`mem("ras").k`)===1,run(`mem("ras")`));
run(`S.due.ras=Date.now()-9*864e5`);
ok("Pegel vergessen (mehr als ein Intervall überfällig)",run(`mem("ras").k`)===0&&run(`mem("ras").t`)==="vergessen");
ok("unbekanntes Wort hat keinen Pegel",run(`mem("hadha")`)===null);
ok("Box 0 ist immer fällig",run(`(S.box.ayn=0,S.due.ayn=Date.now()+99*864e5,mem("ayn").k===0)`));
ok("memBar liefert Balken mit Stufe",/class="pg3 p3"/.test(run(`(S.box.ras=3,S.due.ras=Date.now()+6*864e5,memBar("ras"))`)),run(`memBar("ras")`));
ok("memBar ist leer für neue Wörter",run(`memBar("hadha")`)==="");

// ---------- 3. Harakat ----------
ok("Stufe 1 entfernt kurze Vokale, behält Schadda",run(`hkStrip("مُدَرِّس",1)`)==="مدرِّس".replace(/[ً-ِْٰ]/g,""),run(`hkStrip("مُدَرِّس",1)`));
ok("Stufe 1 behält Schadda wirklich",run(`hkStrip("سُكَّر",1).includes("ّ")`),run(`hkStrip("سُكَّر",1)`));
ok("Stufe 2 entfernt auch Schadda",!run(`hkStrip("سُكَّر",2).includes("ّ")`),run(`hkStrip("سُكَّر",2)`));
ok("Stufe 2 behält Hamza und Madda",run(`hkStrip("آسِف",2)`)==="آسف"&&run(`hkStrip("مَاء",2)`)==="ماء",[run(`hkStrip("آسِف",2)`),run(`hkStrip("مَاء",2)`)]);
ok("Stufe 0 lässt alles stehen",run(`hkStrip("كِتَاب",0)`)==="كِتَاب");
run(`S.hk=1;S.box={};S.due={}`);
ok("neues Wort: Vokalzeichen sichtbar",run(`hkLvl("kitab")`)===0);
run(`S.box.kitab=2`);ok("Box 2: noch mit Vokalzeichen",run(`hkLvl("kitab")`)===0);
run(`S.box.kitab=3`);ok("Box 3: Stufe 1",run(`hkLvl("kitab")`)===1);
run(`S.box.kitab=5`);ok("Box 5: Stufe 2",run(`hkLvl("kitab")`)===2);
run(`S.hk=0`);ok("Einstellung „immer zeigen“ schlägt Box",run(`hkLvl("kitab")`)===0);
run(`S.hk=2;S.box.hadha=undefined`);ok("Einstellung „immer ohne“ gilt auch für neue Wörter",run(`hkLvl("hadha")`)===2);
run(`S.hk=1;S.box.kitab=5`);
let ah=run(`arHead(BY.kitab,64)`);
ok("arHead zeigt beide Fassungen und den Schalter",/class="arw off"/.test(ah)&&/class="a1"/.test(ah)&&/class="a2"/.test(ah)&&/id="hkb"/.test(ah),ah.slice(0,90));
ok("arHead versteckt die Umschrift hinter dem Schalter",/<span class="t2">\(kitāb\)<\/span>/.test(ah));
ah=run(`arHead(BY.kitab,64,true)`);
ok("arHead mit reveal zeigt direkt alles",!/arw off/.test(ah)&&!/id="hkb"/.test(ah)&&/كِتَاب/.test(ah));
ok("arOf folgt der Stufe",run(`arOf(BY.kitab)`)===run(`hkStrip(BY.kitab.ar,2)`));
run(`S.hk=1;S.box={};S.due={}`);

// ---------- 4. Tages-Mischung ----------
run(`S.box={};S.due={};S.ef={};LES[0].w.forEach(id=>{S.box[id]=2;S.due[id]=Date.now()-1000});`);
let p=run(`JSON.stringify({d:mixPlan().due.map(w=>w.i),n:mixPlan().nw.map(w=>w.i),w:mixPlan().weak.map(w=>w.i)})`);
let P=JSON.parse(p);
ok("Mischung nimmt höchstens 8 fällige",P.d.length<=8,P.d.length);
ok("Mischung nimmt höchstens 3 neue",P.n.length<=3,P.n.length);
ok("Mischung hat höchstens 12 Wörter",P.d.length+P.n.length+P.w.length<=12,P.d.length+P.n.length+P.w.length);
ok("keine Doppelten in der Mischung",new Set([...P.d,...P.n,...P.w]).size===P.d.length+P.n.length+P.w.length);
ok("neue Wörter stammen aus der aktuellen Lektion",run(`mixPlan().nw.every(w=>LESOF[w.i]===currentLesson().k)`));
ok("fällige Wörter sind wirklich fällig",run(`mixPlan().due.every(w=>S.due[w.i]<=Date.now())`));
ok("Mischungstext nennt die Teile",/fällig/.test(run(`mixText(mixPlan())`)),run(`mixText(mixPlan())`));
run(`S.box={};S.due={};S.ef={};LES.forEach(l=>l.w.forEach(id=>{S.box[id]=2;S.due[id]=Date.now()+99*864e5}));S.ef[LES[0].w[0]]=.6;S.ef[LES[1].w[0]]=.7;S.ef[LES[2].w[0]]=.8`);
ok("die schwächsten Wörter kommen zuerst",run(`mixPlan().weak.slice(0,3).map(w=>w.i).sort().join()`)===run(`[LES[0].w[0],LES[1].w[0],LES[2].w[0]].sort().join()`),run(`mixPlan().weak.map(w=>w.i).join(",")`));
ok("ohne Fälliges nur eine kurze Runde (max. 6)",run(`mixPlan().weak.length`)===6&&run(`mixPlan().due.length+mixPlan().nw.length`)===0,run(`mixPlan().weak.length`));
ok("gleich starke Wörter wechseln sich ab",new Set([0,0,0,0,0,0].map(()=>run(`mixPlan().weak.map(w=>w.i).join()`))).size>1);
run(`view="home";startMix()`);
ok("startMix startet eine Runde",run(`view`)==="quiz"&&run(`Q.mode`)==="mix",[run(`view`),run(`Q.mode`)]);
ok("Runde enthält Wörter",run(`Q.ws.length>0`),run(`Q.ws.length`));
ok("Mischung markiert Wörter aus anderen Lektionen",run(`Q.ws.every(x=>x.old===(LESOF[x.w.i]!==currentLesson().k))`));
run(`S.st.mix=0;Q.n=Q.ws.length;Q.done=Q.ws.length;Q.right=Q.ws.length;Q.out=false;Q.fin=false;roundEnd()`);
ok("abgeschlossene Mischung wird gezählt",run(`S.st.mix`)===1,run(`S.st.mix`));
ok("Ergebnis nennt die Tages-Mischung",/Tages-Mischung/.test(run(`app.innerHTML`)));
run(`S.box={};S.due={};S.ef={};LES.forEach(l=>l.w.forEach(id=>{S.box[id]=2;S.due[id]=Date.now()+99*864e5}));view="home";startMix()`);
ok("ohne Fälliges gibt es eine kurze Festigungsrunde",run(`view`)==="quiz"&&run(`Q.ws.length<=6`),[run(`view`),run(`Q.ws.length`)]);
run(`S.box={};S.due={};S.ef={};S.aok="skip";home()`);
ok("Startseite bietet „Heute dran“ (Buchstaben übersprungen)",/Heute dran/.test(run(`app.innerHTML`)));
run(`S.aok="";home()`);
ok("Startseite blendet „Heute dran“ aus, solange die Buchstaben offen sind",!/Heute dran/.test(run(`app.innerHTML`)));
ok("Startseite führt dann zu den Buchstaben",/data-ab="0"/.test(run(`app.innerHTML`))&&/Buchstaben 1 von 4/.test(run(`app.innerHTML`)));

// ---------- 5. Zusammenführen und Zurücksetzen ----------
let r=run(`JSON.stringify(mergeS({epoch:0,box:{kitab:1},due:{kitab:100},ef:{kitab:.8}},{epoch:0,box:{kitab:3},due:{kitab:200},ef:{kitab:1.4}}))`);
let R=JSON.parse(r);
ok("Merge: Faktor kommt vom besseren Stand",R.ef.kitab===1.4&&R.box.kitab===3,R.ef);
r=JSON.parse(run(`JSON.stringify(mergeS({epoch:0,box:{kitab:5},due:{kitab:900},ef:{kitab:1.9}},{epoch:0,box:{kitab:2},due:{kitab:100},ef:{kitab:.7}}))`));
ok("Merge: schwächerer Stand überschreibt nicht",r.ef.kitab===1.9&&r.box.kitab===5,r.ef);
r=JSON.parse(run(`JSON.stringify(mergeS({epoch:0,box:{kitab:2},due:{kitab:1},ef:{}},{epoch:0,box:{bayt:1},due:{bayt:1},ef:{bayt:1.3}}))`));
ok("Merge: Faktoren beider Seiten bleiben",r.ef.bayt===1.3&&r.box.kitab===2&&r.box.bayt===1,r);
ok("Merge: Faktor 1 bleibt ungespeichert",r.ef.kitab===undefined);
r=JSON.parse(run(`JSON.stringify(mergeS({epoch:5,box:{},due:{},ef:{x:1.5},hk:2},{epoch:1,box:{kitab:6},due:{kitab:9},ef:{kitab:2}}))`));
ok("Merge: nach Zurücksetzen gewinnt der neuere Stand",r.ef.kitab===undefined&&r.box.kitab===undefined,r);
ok("hk zählt zu den Geräte-Einstellungen",run(`LOCALKEYS.includes("hk")`));

// ---------- 6. alte Regeln bleiben ----------
run(`S.box={};S.due={};S.ef={};S.hk=1`);
ok("gelernt bleibt ab Box 2",run(`(S.box.kitab=1,isLearned("kitab"))`)===false&&run(`(S.box.kitab=2,isLearned("kitab"))`)===true);
ok("Lektion 2 bleibt gesperrt",run(`isLocked(1)`)===true);
run(`LES[0].w.forEach(id=>S.box[id]=1)`);
ok("60 % begonnen schaltet frei",run(`isLocked(1)`)===false);
run(`S.box={};S.due={};LES[0].w.forEach(id=>{S.box[id]=1;S.due[id]=Date.now()-1000});startQuiz(1)`);
ok("Lektionsrunde läuft weiter",run(`view`)==="quiz"&&run(`Q.mode`)==null,[run(`view`),run(`Q.mode`)]);
ok("Lektionsrunde prüft frühere Wörter mit",run(`Q.ws.some(x=>x.old)`));
run(`quiz()`);
ok("Lektionsrunde rendert",run(`app.innerHTML.length>200`));
run(`S.box={};S.due={};S.ef={x:1.5};S.st={};view="settings";settings()`);
ok("Einstellungen zeigen die Vokalzeichen-Option",/Vokalzeichen/.test(run(`app.innerHTML`)));
run(`stats()`);
ok("Statistik zeigt den Gedächtnis-Block",/Gedächtnis/.test(run(`app.innerHTML`)));
run(`ui.les=0;lesson()`);
ok("Lektionsansicht rendert mit Pegel",run(`app.innerHTML.includes("pg3")||app.innerHTML.length>200`));
run(`ui.cat="Alle";ui.q="";list()`);
ok("Wortliste rendert",run(`app.innerHTML.length>500`));
run(`cards()`);ok("Karteikarten rendern",run(`app.innerHTML.length>200`));
// Karteikarten: eine Seite nur Arabisch (Vokalzeichen + Umschrift), die andere NUR Deutsch, sonst nichts
const face=h=>(h.match(/id="fl">([\s\S]*?)<\/button>/)||[])[1]||"";
run(`S.dir="ad";S.box.kitab=5;S.due.kitab=Date.now()+99*864e5;cd.order=["kitab"];cd.n=0;cd.flip=false;cards()`);
run(`cd.order=["kitab"];cd.n=0;cd.flip=false;cards()`);
let f=face(run(`app.innerHTML`));
ok("Karte (ad) vorne: Arabisch mit Vokalzeichen und Umschrift",f.includes("كِتَاب")&&/\(kitāb\)/.test(f),f);
ok("Karte (ad) vorne: nichts sonst (kein Deutsch, kein Plural, keine Beschriftung)",!/Buch|Plural|männlich|Arabisch|Deutsch/.test(f.replace(/lang="ar"/g,"")),f);
ok("Hinweis „Tippen zum Umdrehen“ steht außerhalb der Karte",/Tippen zum Umdrehen/.test(run(`app.innerHTML`))&&!/Tippen/.test(f));
run(`cd.flip=true;cards()`);f=face(run(`app.innerHTML`));
ok("Karte (ad) hinten: NUR das deutsche Wort",f.replace(/<[^>]+>/g,"").trim()==="Buch",f);
ok("Karte hinten ohne Genus/Plural/Beschriftung",!/männlich|Plural|Deutsch|Arabisch|كُتُب/.test(f));
ok("Hinweis wechselt zu „Tippen zum Zurückdrehen“",/Tippen zum Zurückdrehen/.test(run(`app.innerHTML`)));
run(`cd.flip=false;cards()`);ok("Nochmal tippen: wieder Arabisch",face(run(`app.innerHTML`)).includes("كِتَاب"));
run(`S.dir="da";cd.flip=false;cards()`);f=face(run(`app.innerHTML`));
ok("Karte (da) vorne: nur Deutsch",f.replace(/<[^>]+>/g,"").trim()==="Buch",f);
run(`cd.flip=true;cards()`);f=face(run(`app.innerHTML`));
ok("Karte (da) hinten: nur Arabisch mit Umschrift",f.includes("كِتَاب")&&/\(kitāb\)/.test(f)&&!/Buch/.test(f));
ok("Karteikarten-Knopf hat kein aria-label (sonst liest der Screenreader das Wort nicht vor)",!/id="fl" aria-label/.test(run(`app.innerHTML`)));
run(`S.dir="ad";cd.flip=false`);

// ---------- 7. Gleich geschriebene Wörter ----------
run(`S.hk=2;S.box.zuhr=6;S.box.zahr=6;S.box.min=6;S.box.man=6;S.box.kitab=6`);
ok("Mittag/Rücken behalten die Vokalzeichen",run(`hkLvl("zuhr")`)===0&&run(`hkLvl("zahr")`)===0);
ok("von/wer behalten die Vokalzeichen",run(`hkLvl("min")`)===0&&run(`hkLvl("man")`)===0);
ok("eindeutige Wörter bleiben ohne",run(`hkLvl("kitab")`)===2);
ok("gleich geschriebene Wörter gelten als Kollision",run(`clash(BY.zuhr,BY.zahr)`)===true&&run(`clash(BY.min,BY.man)`)===true);
ok("Antwortoptionen enthalten kein gleich geschriebenes Wort",run(`[...Array(20)].every(()=>{const o=options(BY.zuhr);return !o.some(x=>x.i==="zahr")})`));
run(`S.hk=1`);

// ---------- 8. Startseite: Statistik-Einblick ----------
run(`S.box={};S.due={};S.ef={};S.days={};S.hk=1;LES[0].w.forEach((id,i)=>{S.box[id]=i<3?2:1;S.due[id]=Date.now()-1000});S.days[today()]=7;home()`);
f=run(`app.innerHTML`);
ok("Startseite zeigt die Statistik-Karte",/class="card ov"/.test(f)&&/Letzte 7 Tage/.test(f)&&/data-go="stats"/.test(f));
ok("Karte nennt gelernt/begonnen/fällig richtig",/<b>3<\/b><span>von 330 gelernt<\/span>/.test(f)&&new RegExp("<b>"+(run(`LES[0].w.length`)-3)+"</b><span>begonnen").test(f)&&new RegExp("<b>"+run(`dueN()`)+"</b><span>fällig").test(f),f.match(/mnums[\s\S]*?<\/div><\/button>/)?.[0].replace(/<[^>]+>/g," "));
ok("Wochenbalken: sieben Tage, heute markiert",(f.match(/<div class="(t)?"><em><i/g)||[]).length===7&&/<div class="t"><em><i/.test(f));
ok("Karte nennt die Wochensumme",/7 geübt/.test(f),f.match(/\d+ Wör?ter? geübt/)?.[0]);
run(`S.days={};home()`);ok("ohne Übung: 0 Wörter, Balken bleiben sichtbar",/0 geübt/.test(run(`app.innerHTML`)));

// ---------- 9. Sätze ----------
ok("Sätze sind geladen",run(`SENT.length`)>=50,run(`SENT.length`));
ok("jeder Satz hat Blöcke, deren Text dem Satz entspricht",run(`SENT.every(x=>x.t.length>=2&&x.ar===x.t.map(t=>t.a).join(" "))`));
ok("alle Wort-IDs der Sätze existieren",run(`SENT.every(x=>x.ids.every(i=>BY[i]))`));
ok("SFREE enthält nur bekannte Wörter",run(`[...SFREE].every(i=>BY[i])`));
run(`S.box={};S.due={};S.sent={}`);
ok("ohne Fortschritt sind kaum Sätze frei",run(`SENT.filter(sentOpen).length`)<run(`SENT.length`)/3,run(`SENT.filter(sentOpen).length`));
run(`startSatz()`);ok("zu wenige freie Sätze: Runde startet nicht",run(`view`)!=="satz",run(`view`));
run(`W.forEach(w=>{S.box[w.i]=1;S.due[w.i]=Date.now()+864e5})`);
ok("mit allen Wörtern sind alle Sätze frei",run(`SENT.filter(sentOpen).length`)===run(`SENT.length`));
run(`startSatz()`);
ok("Runde startet mit 6 Sätzen",run(`view`)==="satz"&&run(`Z.items.length`)===6,run(`Z.items.length`));
ok("Aufgabentypen wechseln sich ab",run(`Z.items.map(i=>i.type).join()`).split(",").every((t,k,a)=>k===0||t!==a[k-1]),run(`Z.items.map(i=>i.type).join()`));
ok("keine Sätze doppelt in einer Runde",run(`new Set(Z.items.map(i=>i.s.k)).size`)===6);
// Satzbaukasten
run(`Z.items[0].type="bau";Z.n=0;Z.fb=null;Z.sel=[];Z.bank=null;Z.opts=null;satz()`);
const s0=run(`Z.items[0].s.ar`),own=run(`Z.items[0].s.t.length`);
ok("Satzbaukasten: Bank = Satzwörter + 2 Ablenker",run(`Z.bank.length`)===own+2&&run(`Z.bank.filter(b=>!b.own).length`)===2,[run(`Z.bank.length`),own]);
ok("Ablenker kommen nicht im Satz vor",run(`Z.bank.filter(b=>!b.own).every(b=>!Z.items[0].s.t.some(t=>t.a===b.a))`));
ok("Satz steht vor der Antwort nicht auf der Seite",!run(`app.innerHTML`).includes(s0)||run(`Z.bank.length`)>0&&!new RegExp(`<div class="card sans">`).test(run(`app.innerHTML`)));
ok("Prüfen ist ohne Auswahl gesperrt",/id="chk" disabled/.test(run(`app.innerHTML`)));
run(`Z.sel=Z.items[0].s.t.map(t=>Z.bank.find(b=>b.own&&b.a===t.a).u);satz()`);
ok("Prüfen ist mit Auswahl frei",/id="chk" >/.test(run(`app.innerHTML`))||/id="chk"\s*>/.test(run(`app.innerHTML`)));
const xpS=run(`S.xp`);run(`zFinish(Z.sel.map(u=>Z.bank.find(b=>b.u===u).a).join(" ")===Z.items[0].s.ar,10);satz()`);
ok("richtige Reihenfolge: Antwort richtig, +10 XP",run(`Z.fb.ok`)&&run(`S.xp`)-xpS===10&&run(`Z.right`)===1,[run(`Z.fb.ok`),run(`S.xp`)-xpS]);
ok("Fortschritt pro Satz wird gezählt",run(`S.sent[Z.items[0].s.k]`)===1);
ok("nach der Antwort steht die Umschrift da",new RegExp(run(`Z.items[0].s.tr`)).test(run(`app.innerHTML`)));
// falsche Reihenfolge
run(`Z.n=1;Z.fb=null;Z.items[1].type="bau";Z.sel=[];Z.bank=null;satz();Z.sel=Z.items[1].s.t.map(t=>Z.bank.find(b=>b.own&&b.a===t.a).u).reverse();`);
const same=run(`Z.items[1].s.t.length<2`);
const xp2=run(`S.xp`);run(`zFinish(Z.sel.map(u=>Z.bank.find(b=>b.u===u).a).join(" ")===Z.items[1].s.ar,10)`);
ok("falsche Reihenfolge: keine XP, kein Zähler",(run(`Z.fb.ok`)===false)&&run(`S.xp`)===xp2&&!(run(`S.sent[Z.items[1].s.k]`)>0),[run(`Z.fb.ok`),run(`S.xp`)-xp2]);
run(`satz()`);ok("bei Fehler wird der richtige Satz gezeigt",run(`app.innerHTML`).includes(run(`Z.items[1].s.ar`)));
// Satzverständnis
run(`Z.n=2;Z.fb=null;Z.items[2].type="versteh";Z.opts=null;Z.picked=null;satz()`);
ok("Verständnis: 4 Übersetzungen, genau eine richtig",run(`Z.opts.length`)===4&&run(`Z.opts.filter(o=>o===Z.items[2].s).length`)===1&&run(`new Set(Z.opts.map(o=>o.de)).size`)===4);
ok("Verständnis zeigt den arabischen Satz",run(`app.innerHTML`).includes(run(`Z.items[2].s.ar`)));
ok("Verständnis zeigt die deutsche Lösung nicht vorab als markiert",!/class="opt ok"/.test(run(`app.innerHTML`)));
run(`Z.picked=Z.opts.indexOf(Z.items[2].s);zFinish(true,6);satz()`);
ok("Verständnis richtig: grün markiert",/class="opt ok"/.test(run(`app.innerHTML`)));
// Rundenende
run(`Z.n=Z.items.length;Z.fin=false;Z.right=6;Z.xp=40;const r0=S.st.sent||0;satz()`);
ok("Rundenende: Bonus bei fehlerfreier Runde",run(`Z.bonus`)===10);
ok("Rundenende zählt die Runde",run(`S.st.sent`)>=1);
ok("Rundenende nennt Fortschritt",/von \d+ Sätzen/.test(run(`app.innerHTML`)));
// Abzeichen und Zusammenführen
run(`S.sent={};SENT.slice(0,9).forEach(x=>S.sent[x.k]=1);S.badges=[];checkBadges()`);
ok("Abzeichen „Satzbauer“ noch nicht bei 9 Sätzen",!run(`S.badges.includes("sent10")`));
run(`S.sent[SENT[9].k]=1;checkBadges()`);
ok("Abzeichen „Satzbauer“ bei 10 Sätzen",run(`S.badges.includes("sent10")`));
r=JSON.parse(run(`JSON.stringify(mergeS({epoch:0,box:{},due:{},sent:{0:2,1:1}},{epoch:0,box:{},due:{},sent:{0:1,2:3}}))`));
ok("Merge: Satzfortschritt pro Satz das Maximum",r.sent[0]===2&&r.sent[1]===1&&r.sent[2]===3,r.sent);
run(`S.sent={0:1};S.epoch=0;home()`);
f=run(`app.innerHTML`);
ok("Startseite ohne doppelte Einträge (Lernpfad, Sätze, Spiele, Karteikarten)",/class="menu"/.test(f)&&!/data-go="(path|satz|games|cards)"/.test(f.split('class="menu"')[1]||""));
ok("Navigation: Lernpfad steht in der Mitte",run(`TABS.map(t=>t[0]).join()`)==="home,games,path,cards,more",run(`TABS.map(t=>t[0]).join()`));


// ---------- 7. Neuer Lernpfad: Buchstaben, Wörter, Sätze ----------
console.log("\n-- Lernpfad --");
const fileSrc=html;
ok("jede Lektion steht in genau einer Einheit",run(`LES.length===LES_RAW.length&&new Set(LES.map(l=>l.t)).size===LES_RAW.length&&LES.every(l=>l.u>=0&&l.u<UNITS.length)`));
ok("alle Wörter sind weiter da",run(`W.length===LES_RAW.flatMap(l=>l[2]).length&&W.length===330`),run(`W.length`));
ok("Reihenfolge: Hallo sagen, Höflichkeit zuerst",run(`LES[0].t+"|"+LES[1].t`)==="Hallo sagen|Höflichkeit");
ok("Einheiten sind zusammenhängend und aufsteigend",run(`LES.every((l,k)=>!k||l.u>=LES[k-1].u)`));
ok("Wortliste behält die alte Kategorien-Reihenfolge",run(`GROUPS.slice(0,4).join()`)==="Begrüßung,Zahlen,Farben,Familie",run(`GROUPS.join()`));
ok("jeder Satz gehört zu einer Satzrunde",run(`SENT.every(x=>x.st!==undefined&&SSTA[x.st].includes(x))`));
ok("jede Satzrunde hat mindestens 3 Sätze",run(`Object.values(SSTA).every(l=>l.length>=SMIN)`),run(`JSON.stringify(Object.values(SSTA).map(l=>l.length))`));
ok("kein Satz steht vor seinen Wörtern (Satzrunde nie vor der Einheit des spätesten Wortes)",run(`SENT.every(x=>x.ids.filter(i=>!SFREE.has(i)).every(i=>LES[LESOF[i]].u<=x.st))`));
ok("erste Satzrunde schon in Einheit 2",run(`Math.min(...Object.keys(SSTA).map(Number))`)===1,run(`Object.keys(SSTA).join()`));
run(`S.box={};S.due={};LES.filter(l=>l.u<=1).forEach(l=>l.w.forEach(id=>{S.box[id]=1;S.due[id]=Date.now()+864e5}))`);
ok("nach Einheit 1 und 2 sind mindestens 8 Sätze frei",run(`SENT.filter(sentOpen).length`)>=8,run(`SENT.filter(sentOpen).length`));
// alter Fortschritt: schon begonnene Lektionen bleiben trotz neuer Reihenfolge offen
run(`S.box={};S.due={};LES[20].w.slice(0,1).forEach(id=>{S.box[id]=1;S.due[id]=Date.now()+864e5})`);
ok("begonnene Lektion mitten im Pfad ist offen",run(`isLocked(20)`)===false);
ok("die nächste bleibt gesperrt, bis 60 % begonnen sind",run(`isLocked(21)`)===true&&run(`isLocked(19)`)===true);
// Buchstaben-Abschnitt
run(`S.box={};S.due={};S.alpha={};S.aok="";S.sent={};view="path";ui.ask=false`);
ok("frischer Stand: Buchstaben zuerst",run(`alphaGate()&&nextStep().t==="a"&&nextStep().b===0`));
ok("Block 1 offen, Block 2 gesperrt",run(`aLocked(0)`)===false&&run(`aLocked(1)`)===true);
ok("vier Blöcke decken alle 29 Zeichen genau einmal ab",run(`ABLOCKS.flat().length===ALPHA.length&&new Set(ABLOCKS.flat().map(a=>a.i)).size===ALPHA.length`));
run(`ABLOCKS[0].slice(0,4).forEach(a=>S.alpha[a.i]=2)`);
ok("4 von 7 Buchstaben reichen nicht (60 % = 5)",run(`aPass(0)`)===false);
run(`S.alpha[ABLOCKS[0][4].i]=2`);
ok("5 von 7 zweimal erkannt → Block geschafft, Block 2 offen",run(`aPass(0)&&!aLocked(1)`));
ok("einmal richtig zählt noch nicht",(run(`S.alpha[ABLOCKS[0][4].i]=1;aPass(0)`)===false));
run(`ABLOCKS.forEach(b=>b.forEach(a=>S.alpha[a.i]=2))`);
ok("alle Blöcke geschafft → kein Gate mehr",run(`alphaPassed()&&!alphaGate()&&nextStep().t==="v"`));
run(`S.alpha={};S.aok=""`);
run(`path()`);let ph=run(`app.innerHTML`);
ok("Pfad zeigt 4 Buchstaben-Blöcke",(ph.match(/data-ab="/g)||[]).length===4);
ok("Pfad zeigt alle 38 Lektionen",(ph.match(/data-open="/g)||[]).length===38);
ok("Pfad zeigt eine Satzrunde je Einheit mit Sätzen",(ph.match(/data-sat="/g)||[]).length===run(`Object.keys(SSTA).length`));
ok("Pfad zeigt 10 Einheiten plus Schrift-Abschnitt",(ph.match(/class="pgr"/g)||[]).length===11);
ok("erste Lektion ist gesperrt, solange die Buchstaben offen sind",/aria-label="Lektion 1: Hallo sagen, gesperrt"/.test(ph));
ok("Satzrunden sind am Anfang gesperrt",/noch gesperrt, 0 von/.test(ph));
ok("Überspringen-Karte ist da",/Ich kann die Buchstaben schon/.test(ph));
run(`ui.ask=true;path()`);let pa=run(`app.innerHTML`);
ok("Nach Tippen: Kurztest oder ohne Test überspringen",/data-atest/.test(pa)&&/id="sk2"/.test(pa)&&/id="skx"/.test(pa));
run(`ui.ask=false;S.aok="skip";path()`);ph=run(`app.innerHTML`);
ok("Übersprungen: keine Buchstaben-Blöcke mehr im Pfad",!/data-ab="/.test(ph)&&(ph.match(/class="pgr"/g)||[]).length===10);
ok("Übersprungen: erste Lektion ist offen und aktuell",/pn  cur|pn   cur|class="pn  cur/.test(ph)&&!/aria-label="Lektion 1: Hallo sagen, gesperrt"/.test(ph));
ok("Übersprungen: nächster Schritt ist die erste Lektion",run(`!alphaGate()&&nextStep().t==="v"&&nextStep().L.k===0`));
ok("Übersprungen: Karte erlaubt Wiedereinblenden",/id="sk3"/.test(ph)&&/übersprungen/.test(ph));
run(`S.aok="";S.box.kitab=1;path()`);
ok("wer schon Wörter übt, wird nie gebremst",run(`!alphaGate()`)&&!/aria-label="Lektion 1: Hallo sagen, gesperrt"/.test(run(`app.innerHTML`)));
run(`S.box={};S.due={}`);
// Kurztest
run(`S.alpha={};S.aok="";startAQ(undefined,true,"path")`);
ok("Kurztest: 10 verschiedene Buchstaben",run(`AQ.qs.length===10&&new Set(AQ.qs.map(q=>q.a.i)).size===10&&AQ.test&&AQ.back==="path"`));
run(`AQ.n=10;AQ.right=9;aEnd()`);
ok("Kurztest ab 8 richtig: Abschnitt wird übersprungen",run(`S.aok`)==="skip"&&/übersprungen/.test(run(`app.innerHTML`)),run(`S.aok`));
ok("… mit Weg zu den Wörtern",/Zu den Wörtern/.test(run(`app.innerHTML`)));
run(`S.alpha={};S.aok="";startAQ(undefined,true,"path");AQ.n=10;AQ.right=6;aEnd()`);
ok("Kurztest unter 8: nicht übersprungen, mit Hinweis",run(`S.aok`)===""&&/Noch nicht ganz sicher/.test(run(`app.innerHTML`)));
ok("… Rückweg führt zum Lernpfad",/data-go="path">Zurück zum Lernpfad/.test(run(`app.innerHTML`)));
// Blockübung
run(`S.alpha={};S.aok="";startAQ(1,false,"path")`);
ok("Blockübung: nur Buchstaben aus dem Block, jeder genau zweimal",run(`AQ.qs.length===2*ABLOCKS[1].length&&AQ.qs.every(q=>ABLOCKS[1].includes(q.a))&&ABLOCKS[1].every(a=>AQ.qs.filter(q=>q.a===a).length===2)`));
ok("Blockübung: derselbe Buchstabe kommt in anderer Frageform wieder",run(`ABLOCKS[1].every(a=>{const t=AQ.qs.filter(q=>q.a===a).map(q=>q.t);return t[0]!==t[1]})`));
ok("Blockübung: Rückweg führt zum Lernpfad",run(`AQ.back`)==="path"&&/data-go="path"/.test(run(`app.innerHTML`)));
run(`AQ.qs.forEach(q=>{S.alpha[q.a.i]=(S.alpha[q.a.i]||0)+1})`);
ok("eine fehlerfreie Blockrunde schafft den Block",run(`aPass(1)`)===true);
run(`S.alpha={};ABLOCKS.forEach((b,i)=>{if(i<3)b.forEach(a=>S.alpha[a.i]=2)});ABLOCKS[3].slice(0,5).forEach(a=>S.alpha[a.i]=2);S.aok="";startAQ(3,false,"path");AQ.n=AQ.qs.length;AQ.right=AQ.qs.length;aEnd()`);
ok("letzter Block geschafft → „Buchstaben geschafft“ und Abschnitt erledigt",run(`S.aok`)==="done"&&/Buchstaben geschafft/.test(run(`app.innerHTML`)),run(`S.aok`));
// Zusammenführen und Zurücksetzen
r=JSON.parse(run(`JSON.stringify(mergeS({epoch:0,box:{},due:{},aok:""},{epoch:0,box:{},due:{},aok:"skip"}))`));
ok("Merge: übersprungen auf einem Gerät gilt überall",r.aok==="skip",r.aok);
r=JSON.parse(run(`JSON.stringify(mergeS({epoch:0,box:{},due:{},aok:"done"},{epoch:0,box:{},due:{}}))`));
ok("Merge: erledigt bleibt erledigt",r.aok==="done",r.aok);
ok("Zurücksetzen löscht auch den Abschnitt und den neuen Lernpfad",/S\.aok="";S\.kp=\{d:\{\}\};S\.sent=\{\}/.test(fileSrc));
// Satzrunde aus dem Pfad
run(`S.box={};S.due={};S.sent={};S.aok="skip";LES.forEach(l=>l.w.forEach(id=>{S.box[id]=1;S.due[id]=Date.now()+864e5}));startSatz(1)`);
ok("Satzrunde aus dem Pfad: zuerst Sätze dieser Einheit",run(`Z.u===1&&Z.back==="path"&&Z.items.length===6&&Z.items.every(it=>it.s.st===1)`),run(`JSON.stringify(Z.items.map(it=>it.s.st))`));
ok("… Beenden führt zurück zum Lernpfad",/data-go="path"/.test(run(`app.innerHTML`)));
run(`S.sent={};startSatz()`);
ok("Satzrunde ohne Einheit: Rücksprung zur Startseite",run(`Z.u===undefined&&Z.back==="home"`));
// Rechts nach links
run(`S.aok="skip";ui.al="ba";letter()`);let lt=run(`app.innerHTML`);
const labs=[...lt.matchAll(/<small>(Anfang|Mitte|Ende|Allein)<\/small>/g)].map(x=>x[1]);
ok("Buchstabenformen: Reihenfolge Anfang, Mitte, Ende, Allein",labs.join()==="Anfang,Mitte,Ende,Allein",labs);
ok("Buchstabenformen laufen von rechts nach links (direction:rtl)",/\.forms\{[^}]*direction:rtl/.test(fileSrc));
ok("Alphabet-Raster läuft von rechts nach links (Alif oben rechts)",/\.agrid\{[^}]*direction:rtl/.test(fileSrc));
ok("Weiter-Knopf (nächster Buchstabe) steht links",/class="row sp nav2"/.test(lt)&&/\.nav2\{direction:rtl/.test(fileSrc));
// Service Worker: Version im Code und im Worker gleich, Seite wird immer revalidiert
const swSrc=fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),"..","sw.js"),"utf8");
ok("APPV in index.html entspricht V in sw.js",(swSrc.match(/const V="([^"]+)"/)||[])[1]===(fileSrc.match(/const APPV="([^"]+)"/)||[])[1],[(swSrc.match(/const V="([^"]+)"/)||[])[1],(fileSrc.match(/const APPV="([^"]+)"/)||[])[1]]);
ok("Service Worker fragt die Seite immer neu ab (cache:no-cache)",/fetch\(r,\{cache:"no-cache"\}\)/.test(swSrc));
ok("Service Worker meldet offenen Seiten die neue Version",/postMessage\(\{v:V\}\)/.test(swSrc)&&/updBanner\(\)/.test(fileSrc));
// Wortliste: Leiste ohne Scrollbar
ok("Kategorien-Leiste: Scrollbar ausgeblendet (Firefox und WebKit)",/\.chips\{[^}]*scrollbar-width:none/.test(fileSrc)&&/\.chips::-webkit-scrollbar\{display:none\}/.test(fileSrc));
ok("Kategorien-Leiste: Chips schrumpfen nicht",/\.chip\{flex:none/.test(fileSrc));

// ---------- 10. Neuer Lernpfad (Vorschau): Kursdateien, Lektionen, Schlösser ----------
const {pruefen}=await import("./kurs-pruefen.mjs");
const pr=pruefen();
ok("Kursdateien bestehen die Prüfung",pr.fehler.length===0,pr.fehler);
const kdir=path.join(path.dirname(fileURLToPath(import.meta.url)),"..","kurs");
const kidx=JSON.parse(fs.readFileSync(path.join(kdir,"kurs.json"),"utf8")),kfiles={};
kidx.stufen.flatMap(s=>s.etappen).filter(e=>e.datei).forEach(e=>kfiles[e.id]=JSON.parse(fs.readFileSync(path.join(kdir,e.datei),"utf8")));
run(`kursSet(${JSON.stringify(kidx)},${JSON.stringify(kfiles)});S.kp={d:{}};S.alpha={};S.np=true;K=null`);
ok("Etappe S1 hat 6 Lektionen",run(`KL.filter(l=>l.e==="s1").length`)===6,run(`KL.length`));
ok("S1 führt alle 29 Buchstaben genau einmal ein",run(`(a=>a.length===29&&new Set(a).size===29)(KL.filter(l=>l.e==="s1").flatMap(l=>l.neu))`));
ok("erste Lektion offen, zweite gesperrt",run(`!kLocked(KL[0])&&kLocked(KL[1])`));
ok("aktuelle Lektion = erste nicht abgeschlossene",run(`kCur().id`)==="s1-1",run(`kCur().id`));
// Aufgaben jeder Lektion: 12 bis 16 bewertete Aufgaben, neue Buchstaben erst vorstellen, nur bekannte abfragen
const kt=JSON.parse(run(`JSON.stringify(KL.filter(l=>l.art==="buchstaben").map(l=>{const T=kTasks(kLet(l),kKnown(l.k),true),known=new Set([...kKnown(l.k),...kLet(l)].map(a=>a.i)),seen=new Set(kKnown(l.k).map(a=>a.i));let order=true,onlyKnown=true,dots=true;
  T.forEach(t=>{if(t.t==="neu")seen.add(t.a.i);else if(t.t==="paare"){if(!t.set.every(a=>seen.has(a.i)))order=false}else{if(!seen.has(t.a.i))order=false;if(!known.has(t.a.i))onlyKnown=false;if(t.t==="punkte"&&!dotPeers(t.a,[...known].map(i=>ALBY[i])).length)dots=false}});
  return{id:l.id,g:T.filter(t=>t.t!=="neu").length,intro:T.filter(t=>t.t==="neu").length,n:l.neu.length,order,onlyKnown,dots,pairs:T.filter(t=>t.t==="paare").length}}))`));
ok("jede Lektion: 12 bis 16 bewertete Aufgaben",kt.every(x=>x.g>=12&&x.g<=16),kt.map(x=>x.id+":"+x.g));
ok("jeder neue Buchstabe wird einmal vorgestellt",kt.every(x=>x.intro===x.n),kt.map(x=>x.intro+"/"+x.n));
ok("abgefragt wird erst nach dem Vorstellen",kt.every(x=>x.order),kt.filter(x=>!x.order).map(x=>x.id));
ok("abgefragt werden nur schon eingeführte Buchstaben",kt.every(x=>x.onlyKnown));
ok("Punkte-Aufgaben nur mit bekannten Buchstaben derselben Form",kt.every(x=>x.dots));
ok("jede Lektion hat eine Zuordnungs-Aufgabe",kt.every(x=>x.pairs===1));
ok("ohne Stimme keine Höraufgaben",run(`KL.filter(l=>l.art==="buchstaben").every(l=>kTasks(kLet(l),kKnown(l.k),false).every(t=>t.t!=="hoeren"))`));
ok("Ablenker: bei bekannten zuerst bekannte Buchstaben",run(`(()=>{const kn=[...kKnown(4),...kLet(KL[4])];for(let i=0;i<20;i++){if(!kDistr(ALBY.kaf,kn,3).every(x=>kn.includes(x)))return false}return true})()`));
// eine Lektion durchspielen
run(`function playK(wrong){let g=0;while(K.n<K.T.length&&g++<300){const it=K.T[K.n];if(it.t==="paare"){K.fb={ok:true,x:5};K.first++}else if(!KCARD.includes(it.t))kAns(!wrong.includes(K.n));K.n++;K.fb=null;K.picked=null;K.ps=null}klek()}`);
run(`S.xp=0;startK(KL[0])`);
ok("Lektion startet mit der Tipp-Karte",run(`view==="klek"&&K.T[0].t==="tipp"`)&&/Gut zu wissen/.test(run(`app.innerHTML`)));
run(`K.n=1;klek()`);
ok("dann wird der erste Buchstabe vorgestellt",/Neuer Buchstabe/.test(run(`app.innerHTML`))&&/Name anhören/.test(run(`app.innerHTML`)));
ok("keine Herzen in der Lektion",!/hearts|hrt/.test(run(`app.innerHTML`)));
const kT0=run(`K.T.length`),kW=run(`K.T.findIndex(t=>!["neu","tipp","paare"].includes(t.t))`);
run(`K.n=${kW};kAns(false)`);
ok("Fehler: die Aufgabe kommt am Ende noch einmal",run(`K.T.length`)===kT0+1&&run(`K.T[K.T.length-1].rep===true&&K.T[K.T.length-1].a.i===K.T[${kW}].a.i`));
run(`klek()`);
ok("… und die Rückmeldung sagt es",/am Ende noch einmal/.test(run(`app.innerHTML`)));
run(`K.n=0;K.fb=null;K.T.pop();K.miss=0;playK([${kW}])`);
ok("Lektion abgeschlossen → gespeichert",run(`S.kp.d["s1-1"]`)===1,run(`JSON.stringify(S.kp)`));
ok("Ende: „Lektion geschafft“ und Weiter zur nächsten",/Lektion geschafft/.test(run(`app.innerHTML`))&&/data-kl="s1-2"/.test(run(`app.innerHTML`)));
ok("Wiederholte Aufgabe zählt nicht als gleich richtig",run(`K.first===K.graded-1`),[run(`K.first`),run(`K.graded`)]);
ok("XP: 3 pro Aufgabe, 1 für die Wiederholung, Bonus für den Abschluss",run(`S.xp`)===run(`K.xp`)&&run(`K.bonus`)===10,[run(`S.xp`),run(`K.xp`),run(`K.bonus`)]);
ok("zweite Lektion jetzt offen, dritte noch gesperrt",run(`!kLocked(KL[1])&&kLocked(KL[2])&&kCur().id==="s1-2"`));
ok("Buchstaben-Zähler steigen (Alphabet-Seite zeigt den Stand)",run(`kLet(KL[0]).every(a=>aCnt(a.i)>=1)`));
run(`startK(KL[0]);playK([])`);
ok("eine abgeschlossene Lektion lässt sich wiederholen",run(`S.kp.d["s1-1"]`)===2&&/Geübt/.test(run(`app.innerHTML`)));
// der neue Pfad
run(`view="path";ui.hint=null;path()`);let kh=run(`app.innerHTML`);
ok("Pfad zeigt die Stationen von S1 bis S4 (6, 7, 5 und 4)",(kh.match(/class="pn /g)||[]).length===22&&[["s1",6],["s2",7],["s3",5],["s4",4]].every(([e,n])=>(kh.match(new RegExp('data-kl="'+e+'-\\d"',"g"))||[]).length===n));
ok("… erledigt, aktuell (Mim) und gesperrt",/pn abl done[^"]*" data-kl="s1-1"/.test(kh)&&/pn abl\s+cur[^"]*" data-kl="s1-2"/.test(kh)&&/pn abl lock[^"]*" data-kl="s1-3"/.test(kh),kh.match(/class="pn [^"]*" data-kl="s1-\d"/g));
ok("… Ziel der Etappe mit allen 29 Buchstaben",/Ziel der Etappe/.test(kh)&&(kh.match(/<span class="[ku]">/g)||[]).length===29);
ok("… Demnächst: S5 bis S8",(kh.match(/<li><span class="ar" lang="ar">/g)||[]).length===4&&/S5 · Lange Vokale/.test(kh)&&/S8 · Alles zusammen/.test(kh)&&!/<b>S4 · /.test(kh));
ok("… Vorschau-Hinweis mit Weg zurück",/data-ko/.test(kh)&&/Vorschau/.test(kh));
ok("… keine Buchnamen oder Verweise",!/Qaida|Noorani|Nuraniyya|Medina|Madina|Band [123]/i.test(kh+fs.readdirSync(kdir).map(n=>fs.readFileSync(path.join(kdir,n),"utf8")).join("")));
run(`pHint('data-kl="s1-3"')`);
ok("gesperrte Station: Grund direkt darunter",/Schließe erst „Jīm bis Dhāl“ ab\./.test(run(`app.innerHTML`)));
run(`home()`);
ok("Startseite: Weiterlernen führt zur aktuellen Lektion",/data-kl="s1-2"/.test(run(`app.innerHTML`))&&/Etappe S1 · Lektion 2: Jīm bis Dhāl/.test(run(`app.innerHTML`)));
run(`S.np=false;path()`);
ok("bisheriger Pfad bleibt und bietet die Vorschau an",/data-kn/.test(run(`app.innerHTML`))&&/data-open="0"/.test(run(`app.innerHTML`)));
// Wiederholung aller Buchstaben
run(`S.kp={d:{}};view="path";startK(null)`);
ok("Wiederholung erst nach der ersten Lektion",run(`view`)==="path");
run(`S.kp={d:{"s1-1":1,"s1-2":1,"s1-3":1}};startK(null)`);
ok("Wiederholung: 10 Aufgaben plus Zuordnen, nur gelernte Buchstaben",run(`view==="klek"&&K.T.length===11&&K.T.filter(t=>t.t==="paare").length===1&&K.T.every(t=>t.t==="paare"?t.set.every(a=>kLearnt().includes(a)):kLearnt().includes(t.a))`));
run(`playK([])`);
ok("Wiederholung zählt nicht als Lektion",run(`JSON.stringify(S.kp.d)`)==='{"s1-1":1,"s1-2":1,"s1-3":1}'&&/Runde beendet/.test(run(`app.innerHTML`)));
// Zusammenführen und Geräte-Einstellung
r=JSON.parse(run(`JSON.stringify(mergeS({epoch:0,box:{},due:{},kp:{d:{"s1-1":2}}},{epoch:0,box:{},due:{},kp:{d:{"s1-1":1,"s1-2":1}}}))`));
ok("Merge: abgeschlossene Lektionen von beiden Geräten",r.kp.d["s1-1"]===2&&r.kp.d["s1-2"]===1,r.kp);
r=JSON.parse(run(`JSON.stringify(mergeS({epoch:0,box:{},due:{}},{epoch:0,box:{},due:{}}))`));
ok("Merge: alter Stand ohne Lernpfad-Daten geht",JSON.stringify(r.kp)==='{"d":{}}',r.kp);
ok("Vorschau an/aus bleibt auf dem Gerät",run(`LOCALKEYS.includes("np")`));
ok("Service Worker: Kursdateien offline verfügbar",kidx.stufen.flatMap(s=>s.etappen).filter(e=>e.datei).every(e=>swSrc.includes(`"kurs/${e.datei}"`))&&swSrc.includes('"kurs/kurs.json"'));
ok("Service Worker: Kursdateien zuerst aus dem Netz",/\\\/kurs\\\/\[\^\/\]\+\\\.json\$/.test(swSrc));

// ---------- 11. Etappe S2: Buchstaben verbinden und Surenanfänge ----------
run(`S.kp={d:{}};S.alpha={};K=null;ARV=null;S.np=true`);
const s1done=`S.kp={d:Object.fromEntries(KL.filter(l=>l.e==="s1").map(l=>[l.id,1]))}`;
ok("Etappe S2 hat 7 Lektionen: 6 zum Verbinden, 1 mit Surenanfängen",run(`(l=>l.length===7&&l.filter(x=>x.art==="verbinden").length===6&&l[6].art==="suren")(KL.filter(l=>l.e==="s2"))`));
ok("S2 führt die Formen aller Buchstaben mit Formen genau einmal ein",run(`(a=>a.length===29&&new Set(a).size===29)(KL.filter(l=>l.e==="s2").flatMap(l=>l.neu||[]))`));
ok("S2 erst nach S1: gesperrt, Grund „nach Etappe S1“",run(`kLocked(KL.find(l=>l.id==="s2-1"))`)&&/nach Etappe S1/.test((run(`view="path";ui.hint=null;path();app.innerHTML`).match(/data-kl="s2-1"[\s\S]*?<\/button>/)||[""])[0]));
ok("Buchstaben-Wissen zählt nur Buchstaben-Lektionen",run(`kKnown(KL.length).length===29&&kFormKnown(KL.length).length===29`));
ok("Wörter werden in Buchstaben zerlegt",run(`kChars("بيت").map(a=>a.i).join()`)==="ba,ya,ta"&&run(`kChars("سماء").map(a=>a.i).join()`)==="sin,mim,alif,hamza"&&run(`kChars("لا").map(a=>a.i).join()`)==="lam,alif");
ok("Surenanfänge: Zeichen und Leerzeichen zählen nicht mit",run(`kChars("حمٓ عٓسٓقٓ").map(a=>a.i).join()`)==="hha,mim,ayn,sin,qaf");
ok("Surenanfänge werden Buchstabe für Buchstabe gelesen, ohne Hamza am Namensende",run(`kLesung("كٓهيعٓصٓ")`)==="Kāf Hā Yā ʿAyn Ṣād"&&run(`kLesung("الٓر")`)==="Alif Lām Rā"&&run(`kLesung("طه")`)==="Ṭā Hā",[run(`kLesung("كٓهيعٓصٓ")`)]);
ok("alle Wörter und Surenanfänge bestehen nur aus Buchstaben des Alphabets",run(`KL.filter(l=>l.e==="s2").every(l=>[...(l.woerter||[]),...(l.suren||[]).map(s=>s.t)].every(w=>kChars(w).every(Boolean)))`));
ok("Formen: Hamza hat keine, die Einzelgänger nur das Ende",run(`posOf(ALBY.hamza).length===0&&posOf(ALBY.ra).join()==="f"&&posOf(ALBY.ba).join()==="b,m,f"`));
const vt=JSON.parse(run(`JSON.stringify(KL.filter(l=>l.e==="s2").map(l=>{const T=kGen(l,true),seen=new Set(),fk=new Set(kFormKnown(l.k).map(a=>a.i));let order=true,ownW=true,oldOk=true;
  T.forEach(t=>{if(t.t==="neuform")seen.add(t.a.i);else if(["form","formsuche","einzel"].includes(t.t)&&!seen.has(t.a.i)&&!fk.has(t.a.i))order=false;
    if(t.t==="form"&&fk.has(t.a.i)&&!fk.has(t.a.i))oldOk=false;if(t.t==="bauen"&&!l.woerter.includes(t.w))ownW=false;
    if(t.t==="zerlegen"&&!(l.woerter||l.suren.map(s=>s.t)).includes(t.w))ownW=false});
  return{id:l.id,g:T.filter(t=>!KCARD.includes(t.t)).length,nf:T.filter(t=>t.t==="neuform").length,n:(l.neu||[]).length,ns:T.filter(t=>t.t==="neusure").length,
    tipp:T[0].t==="tipp",order,ownW,kinds:[...new Set(T.map(t=>t.t))],z:T.filter(t=>t.t==="zerlegen").length,b:T.filter(t=>t.t==="bauen").length,
    noHamza:T.every(t=>!["form","formsuche","einzel"].includes(t.t)||t.a.i!=="hamza"),einzelNj:T.every(t=>t.t!=="einzel"||t.a.nj)}}))`));
ok("S2: jede Lektion 12 bis 16 bewertete Aufgaben",vt.every(x=>x.g>=12&&x.g<=16),vt.map(x=>x.id+":"+x.g));
ok("S2: jede Lektion beginnt mit dem Tipp",vt.every(x=>x.tipp));
ok("S2: jeder Buchstabe bekommt eine Formen-Karte",vt.every(x=>x.nf===x.n),vt.map(x=>x.nf+"/"+x.n));
ok("S2: Formen erst abgefragt, wenn sie vorgestellt sind",vt.every(x=>x.order),vt.filter(x=>!x.order).map(x=>x.id));
ok("S2: Wörter stammen aus der eigenen Lektion",vt.every(x=>x.ownW));
ok("S2: kein Hamza in Formen-Aufgaben, „verbindet sich nicht“ nur bei Einzelgängern",vt.every(x=>x.noHamza&&x.einzelNj));
ok("S2: zerlegen und zusammensetzen in jeder Verbinden-Lektion (Lām-Alif mit mehr Wörtern)",vt.slice(0,5).every(x=>x.z===3&&x.b===2)&&vt[5].z===5&&vt[5].b===4,vt.map(x=>x.z+"+"+x.b));
ok("S2: „verbindet sich nicht“ nur in der Lektion mit den Einzelgängern",vt.every((x,k)=>x.kinds.includes("einzel")===(k===4)));
ok("S2: Surenanfänge: 4 vorgestellt, dann lesen und zerlegen",vt[6].ns===4&&vt[6].kinds.includes("sure")&&vt[6].z===3&&!vt[6].kinds.includes("form"),vt[6]);
ok("S2: Höraufgaben zu Surenanfängen nur, wenn eine arabische Stimme sicher da ist",run(`kGen(KL.find(l=>l.id==="s2-7"),true).every(t=>t.t!=="surehoeren")`)&&run(`ARV=true;(T=>T.some(t=>t.t==="surehoeren"))(kGen(KL.find(l=>l.id==="s2-7"),true))`)&&run(`ARV=null;true`));
ok("S2: die neuen Buchstaben werden in der Lām-Alif-Lektion nicht vorgestellt, frühere Formen kommen dran",run(`(T=>!T.some(t=>t.t==="neuform")&&T.filter(t=>t.t==="form").length>=2)(kGen(KL.find(l=>l.id==="s2-6"),true))`));
// Antworten
ok("Zusammensetzen: drei verschiedene falsche Varianten für jedes Wort",run(`KL.filter(l=>l.art==="verbinden").flatMap(l=>l.woerter).every(w=>{for(let i=0;i<5;i++){const v=kVariants(w);if(v.length!==3||new Set(v).size!==3||v.includes(w))return false}return true})`));
run(s1done+`;startK(KL.find(l=>l.id==="s2-1"))`);
const kOk=t=>run(`(()=>{const it=${t};kOpts(it);return it.opts.length===4&&new Set(it.opts).size===4&&it.opts[it.ok]===(it.t==="bauen"?it.w:it.t==="sure"?it.s.lesung:it.t==="surehoeren"?it.s.t:aform(it.a,it.pos))})()`);
ok("Formsuche: vier verschiedene Formen, die richtige dabei",["ba","ta","ya","nun"].every(i=>["b","m","f"].every(p=>kOk(`{t:"formsuche",a:ALBY.${i},pos:"${p}"}`)))&&kOk(`{t:"formsuche",a:ALBY.ra,pos:"f"}`));
ok("Formsuche: bei Einzelgängern keine Form desselben Buchstabens als Falle",run(`(()=>{for(let i=0;i<20;i++){const it={t:"formsuche",a:ALBY.dal,pos:"f"};kOpts(it);if(it.opts.filter(o=>o.includes("د")).length!==1)return false}return true})()`));
ok("Zusammensetzen und Surenanfänge: vier verschiedene Antworten",kOk(`{t:"bauen",w:"بيت"}`)&&kOk(`{t:"bauen",w:"لا"}`)&&kOk(`{t:"sure",s:kSuren(KL.find(l=>l.id==="s2-7"))[0],pool:kSuren(KL.find(l=>l.id==="s2-7"))}`)&&kOk(`{t:"surehoeren",s:kSuren(KL.find(l=>l.id==="s2-7"))[6],pool:kSuren(KL.find(l=>l.id==="s2-7"))}`));
// Darstellung
const kShow=t=>run(`K.T.splice(K.n,0,${t});K.fb=null;K.sel=[];klek();app.innerHTML`);
let sh=kShow(`{t:"neuform",a:ALBY.ba,w:"بيت"}`);
ok("Formen-Karte: vier Formen, Wortbeispiel, Name anhören",/So verbindet sich <b>Bāʾ<\/b>/.test(sh)&&(sh.match(/<small>(Anfang|Mitte|Ende|Allein)<\/small>/g)||[]).length===4&&/Im Wort: <span class="ar" lang="ar">بيت/.test(sh)&&/Name anhören/.test(sh));
sh=kShow(`{t:"neuform",a:ALBY.ra}`);
ok("Formen-Karte Einzelgänger: erklärt, warum Anfang und Mitte fehlen",/nie mit dem danach/.test(sh));
sh=kShow(`{t:"form",a:ALBY.ba,pos:"m"}`);
ok("Form erkennen: Form in der Mitte, Namen zur Auswahl",sh.includes(`<div class="ar kgl" lang="ar">‍ب‍</div>`)&&/in der Mitte eines Wortes/.test(sh)&&(sh.match(/data-o="/g)||[]).length===4);
sh=kShow(`{t:"zerlegen",w:"طبيب"}`);
const zb=run(`K.T[K.n].bank.length`);
ok("Zerlegen: Wort, Prüfen gesperrt, Buchstaben plus 3 Fallen",/kwd" lang="ar">طبيب/.test(sh)&&/id="chk" disabled/.test(sh)&&zb===7&&/Tippe die 4 Buchstaben/.test(sh),zb);
run(`K.sel=(it=>{const u=[];kChars(it.w).forEach(a=>u.push(it.bank.find(b=>b.a===a&&!u.includes(b.u)).u));return u})(K.T[K.n]);klek()`);
ok("… alle gewählt: Prüfen frei, Reihenfolge von rechts nach links",/id="chk" >Prüfen/.test(run(`app.innerHTML`))&&run(`K.sel.map(u=>K.T[K.n].bank[u].a.c).join("")`)==="طبيب");
run(`kAns(false);klek()`);sh=run(`app.innerHTML`);
ok("… falsch: Lösung als Buchstabenreihe wie die eigene Antwort, Aufgabe kommt wieder (neu gemischt)",/Richtig ist:<\/p><div class="sb ok kzs"[^>]*>(<span class="tk" lang="ar">[طبي]<\/span>){4}<\/div>/.test(sh)&&(sh.match(/class="tk" lang="ar">(.)</g)||[]).slice(-4).map(x=>x.slice(-2,-1)).join("")==="طبيب"&&!/data-add=/.test(sh)&&/am Ende noch einmal/.test(sh)&&run(`(r=>r.rep&&r.t==="zerlegen"&&r.w==="طبيب"&&r.bank===null)(K.T[K.T.length-1])`));
sh=kShow(`{t:"bauen",w:"بنت"}`);
ok("Zusammensetzen: Buchstaben mit Pluszeichen, vier Wörter zur Auswahl",/kbt" lang="ar">ب \+ ن \+ ت</.test(sh)&&(sh.match(/data-o="\d"/g)||[]).length===4);
sh=kShow(`{t:"einzel",a:ALBY.ra}`);
ok("Einzelgänger finden: einer verbindet sich nicht, drei schon",/verbindet sich nicht mit dem folgenden/.test(sh)&&run(`K.T[K.n].opts.filter(o=>o.nj).length===1`));
run(`K=null;S.kp={d:{}};${s1done};startK(KL.find(l=>l.id==="s2-7"))`);
sh=kShow(`{t:"neusure",s:kSuren(K.l)[6]}`);
ok("Surenanfang-Karte: Text, Lesung und die Buchstaben einzeln",/kSn|ksn/.test(sh)&&/<b>Kāf Hā Yā ʿAyn Ṣād<\/b>/.test(sh)&&(sh.match(/<small>(Kāf|Hā|Yā|ʿAyn|Ṣād)<\/small>/g)||[]).length===5);
sh=kShow(`{t:"sure",s:kSuren(K.l)[0],pool:kSuren(K.l)}`);
ok("Surenanfang lesen: vier Lesungen zur Auswahl",/Wie liest man diesen Surenanfang/.test(sh)&&/>Alif Lām Mīm</.test(sh)&&(sh.match(/class="opt /g)||[]).length===4);
// Durchspielen
run(`K=null;S.xp=0;${s1done}`);
for(const id of ["s2-1","s2-2","s2-3","s2-4","s2-5","s2-6","s2-7"]){run(`startK(KL.find(l=>l.id==="${id}"));playK([])`)}
ok("alle Lektionen von S2 durchgespielt und gespeichert",run(`KL.filter(l=>l.e==="s2").every(l=>S.kp.d[l.id]===1)`));
sh=run(`app.innerHTML`);
ok("Ende der Etappe: geschafft, Text aus der Kursdatei, weiter zur nächsten Etappe",/Etappe „Buchstaben verbinden“ geschafft/.test(sh)&&/Du kannst jetzt verbundene Buchstaben lesen/.test(sh)&&!/nächste Etappe ist in Arbeit/.test(sh)&&/data-kl="s3-1"[^>]*>Weiter: Etappe S3, Fatha/.test(sh)&&/Gelesen/.test(sh));
run(`view="path";ui.hint=null;path()`);kh=run(`app.innerHTML`);
ok("Pfad S2: Stationen zeigen ihr Wort",/data-kl="s2-1"[^>]*>[\s\S]*?(<svg|<span class="ar" lang="ar">بيت)/.test(kh));
ok("Pfad S2: Ziel mit dem längsten Surenanfang, nach der Etappe mit Lesung",/class="sgn kzl all/.test(kh)&&/data-kz="s2"[^>]*>كٓهيعٓصٓ/.test(kh)&&/Kāf Hā Yā ʿAyn Ṣād/.test(kh)&&/data-krev="s2"/.test(kh));
run(`${s1done};path()`);kh=run(`app.innerHTML`);
ok("Pfad S2 vorher: Ziel noch ohne Lesung, Üben gesperrt, erste Station offen",/class="sgn kzl  /.test(kh)&&!/Kāf Hā Yā ʿAyn Ṣād/.test(kh)&&/class="sbt lock" data-krev="s2"/.test(kh)&&/5 Buchstaben verbinden/.test(kh)&&/0 von 7 Lektionen geschafft/.test(kh));
ok("Stationslabel nach Art der Lektion",run(`[kSm(KL.find(l=>l.id==="s2-5")),kSm(KL.find(l=>l.id==="s2-6")),kSm(KL.find(l=>l.id==="s2-7")),kSm(KL[0])].join("|")`)==="7 Buchstaben verbinden|11 Wörter lesen|14 Surenanfänge|4 neue Buchstaben");
run(`view="path";startK(null,"s2")`);
ok("Wiederholung S2 erst nach einer Lektion der Etappe",run(`view`)==="path");
run(`S.kp.d["s2-1"]=1;S.kp.d["s2-7"]=1;startK(null,"s2")`);
ok("Wiederholung S2: 12 Aufgaben aus geschafften Lektionen, ohne Karten, höchstens einmal zuordnen",run(`view==="klek"&&K.T.length===12&&K.T.every(t=>!KCARD.includes(t.t))&&K.T.filter(t=>t.t==="paare").length<=1&&K.T.every(t=>!t.w||["بيت","بنت","بين","تين","نبي","نبت","ثبت"].includes(t.w)||kSuren(KL.find(l=>l.id==="s2-7")).some(s=>s.t===t.w))`));
run(`playK([])`);
ok("… Ende: Runde beendet, nochmal üben bleibt in der Etappe",/Runde beendet/.test(run(`app.innerHTML`))&&/Wiederholung · Etappe S2/.test(run(`app.innerHTML`))&&/data-krev="s2"/.test(run(`app.innerHTML`)));
run(`S.np=false;path()`);
ok("bisheriger Pfad nennt die spielbaren Etappen",/Schon spielbar: „Die Buchstaben“, „Buchstaben verbinden“, „Kurze Vokale“ und „Tanwin“\./.test(run(`app.innerHTML`)));
run(`S.np=true`);
const {texts}=await import("./audio-texts.mjs");
const at=texts().filter(t=>t.id.startsWith("k/"));
ok("Vorleseliste enthält alle 14 Surenanfänge",at.filter(t=>t.de.startsWith("Surenanfang")).length===14&&at.some(t=>t.text==="كَافْ هَا يَا عَيْنْ صَادْ"),at.length);

// ---------- 12. Etappen S3 und S4: kurze Vokale, Tanwin, Nachsprechen ----------
run(`S.kp={d:{}};S.alpha={};K=null;ARV=null;S.np=true;AUD={}`);
const s2done=`S.kp={d:Object.fromEntries(KL.filter(l=>l.e==="s1"||l.e==="s2").map(l=>[l.id,1]))}`;
ok("S3 hat 5 Lektionen, S4 hat 4, alle mit Vokalzeichen",run(`((a,b)=>a.length===5&&b.length===4&&[...a,...b].every(l=>l.art==="vokale"))(KL.filter(l=>l.e==="s3"),KL.filter(l=>l.e==="s4"))`));
ok("neue Zeichen in dieser Reihenfolge: Fatha, Kasra, Damma, Hamza auf Alif, dann -an, -in, -un, Ta marbuta",run(`KL.filter(l=>l.art==="vokale").map(l=>l.zeichen||"-").join()`)==="a,i,u,hamza,-,an,in,un,ta",run(`KL.filter(l=>l.art==="vokale").map(l=>l.zeichen||"-").join()`));
const TR={"كَتَبَ":"kataba","شَرِبَ":"shariba","كُتِبَ":"kutiba","أَكَلَ":"akala","سَأَلَ":"saʾala","قَرَأَ":"qaraʾa","إِبِلٌ":"ibilun","وَأَكَلَ":"waʾakala","قَلَمًا":"qalaman","بِقَلَمٍ":"biqalamin","شَجَرَةٌ":"shajaratun","شَجَرَةً":"shajaratan","سَمِعَ":"samiʿa","هُوَ سَمِعَ وَفَهِمَ":"huwa samiʿa wafahima","خَرَجَ":"kharaja","ذَهَبٌ":"dhahabun"};
const trBad=Object.entries(TR).filter(([w,l])=>run(`kTr("${w}")`)!==l).map(([w])=>w+"→"+run(`kTr("${w}")`));
ok("Umschrift: ein Laut je Buchstabe, Hamza am Wortanfang stumm, -an ohne Alif-Laut, ة als t",!trBad.length,trBad);
ok("jedes Wort zerfällt in Silben und lässt sich daraus genau wieder zusammensetzen",run(`KL.filter(l=>l.art==="vokale").flatMap(l=>l.woerter.map(w=>w[0])).every(w=>kJoin(kUnits(w))===w&&kUnits(w).every(u=>u.sp||u.a&&u.v))`));
ok("Silben: -an mit stummem Alif, aber nicht nach ة; Hamza mit Kasra unter dem Alif",run(`[kSyl("ب","an"),kSyl("ة","an"),kSy(ALBY.hamza,"i").t,kSy(ALBY.hamza,"a").lat,kSy(TAM,"un").lat].join("|")`)==="بًا|ةً|إِ|ʾa|tun");
ok("Silbentafeln: 27 Silben je Vokal, Hamza erst ab seiner Lektion, Ta marbuta nur mit Tanwin",run(`[kSylls(["a"],"a").length,kSylls(["a","hamza"],"a").length,kSylls(["a","an"],"an").length,kSylls(["a","an","ta"],"an").length,kSylls(["a","ta"],"a").length].join()`)==="27,28,27,28,27");
const zt=JSON.parse(run(`JSON.stringify([false,true].flatMap(h=>KL.filter(l=>l.art==="vokale").map(l=>{ARV=h?true:null;const T=kGen(l,h),zk=kZK(l.k),MK={"َ":"a","ِ":"i","ُ":"u","ً":"an","ٍ":"in","ٌ":"un"};
  const known=t=>[...t].every(c=>!MK[c]||zk.includes(MK[c]))&&(!/[أإ]/.test(t)||zk.includes("hamza"))&&(!/ة/.test(t)||zk.includes("ta"));let onlyKnown=true,ownW=true;
  T.forEach(t=>{if(t.y&&!known(t.y.t))onlyKnown=false;if(t.wo&&!l.woerter.some(w=>w[0]===t.wo.w))ownW=false;if(KCHO.includes(t.t)){kOpts(t);if(!t.opts.every(known))onlyKnown=false}
    if(t.t==="bau"&&!t.bank)t.bank=kBauD(t.wo,t.zk);if(t.t==="bau"&&!t.bank.every(known))onlyKnown=false});
  return{id:l.id,h,g:T.filter(t=>!KCARD.includes(t.t)).length,tipp:T[0].t==="tipp",nz:T.filter(t=>t.t==="neuz").length,tf:(T.find(t=>t.t==="tafel")||{sy:[]}).sy.length,onlyKnown,ownW,
    kinds:[...new Set(T.map(t=>t.t))],hearS:T.some(t=>t.t==="silbehoeren"),sp:T.filter(t=>t.t==="sprechen").length}})))`));
ok("S3/S4: jede Lektion 12 bis 16 bewertete Aufgaben, mit und ohne Stimme",zt.every(x=>x.g>=12&&x.g<=16),zt.map(x=>x.id+":"+x.g));
ok("S3/S4: Tipp zuerst, neues Zeichen mit Karte und Silbentafel",zt.every(x=>x.tipp&&(x.id==="s3-5"?x.nz===0:x.nz===1))&&zt.filter(x=>!x.h).map(x=>x.tf).join()==="27,27,27,3,0,27,27,27,3",zt.map(x=>x.tf));
ok("S3/S4: Aufgaben und Antworten nutzen nur schon eingeführte Zeichen",zt.every(x=>x.onlyKnown),zt.filter(x=>!x.onlyKnown).map(x=>x.id));
ok("S3/S4: Wörter stammen aus der eigenen Lektion",zt.every(x=>x.ownW));
ok("S3/S4: lesen, Lücke (ab zwei Vokalen), bauen; Hören und Nachsprechen nur mit sicherer Stimme",zt.every(x=>x.kinds.includes("wortlesen")&&x.kinds.includes("bau")&&x.kinds.includes("luecke")===(x.id!=="s3-1")&&x.kinds.includes("worthoeren")===x.h&&x.sp===(x.h?1:0)&&!x.hearS));
run(`AUD={"بَ":{f:"x"},"تَ":{f:"x"}};for(const y of kSylls(["a"],"a"))AUD[y.t]={f:"x"}`);
run(`ARV=null`);
ok("mit Audiodateien der Silben: Silbe hören und Silbe nachsprechen kommen dazu",run(`(T=>T.some(t=>t.t==="silbehoeren")&&T.filter(t=>t.t==="sprechen"&&t.y).length===1&&T.find(t=>t.t==="paare").set.every(x=>x.sp))(kGen(KL.find(l=>l.id==="s3-1"),true))`));
run(`AUD={}`);
ok("Paare: Silben und Umschrift, keine doppelte Umschrift, das neue Zeichen ist dabei",run(`KL.filter(l=>l.art==="vokale"&&l.zeichen).every(l=>{for(let r=0;r<10;r++){const p=kGen(l,false).find(t=>t.t==="paare");if(!p||p.set.length!==5||new Set(p.set.map(x=>x.n)).size!==5||!p.syl)return false}return true})`));
ok("Wortvarianten: drei verschiedene Lesungen mit bekannten Zeichen für jedes Wort",run(`KL.filter(l=>l.art==="vokale").every(l=>l.woerter.every(([w])=>{for(let i=0;i<4;i++){const v=kWVar(w,kZK(l.k));if(v.length!==3||new Set(v.map(kTr)).size!==3||v.includes(w))return false}return true}))`));
// Darstellung
run(s2done+`;startK(KL.find(l=>l.id==="s3-2"))`);
let zh=kShow(`{t:"neuz",z:"i",wo:kWs(K.l)[0]}`);
ok("Zeichen-Karte: Kasra, Klang, Beispielwort mit Umschrift und Bedeutung",/Neues Zeichen/.test(zh)&&/<b>Kasra<\/b> · klingt wie i/.test(zh)&&/Im Wort: <span class="ar" lang="ar">شَرِبَ<\/span>/.test(zh)&&/shariba · er trank/.test(zh)&&/id="nx" >Weiter/.test(zh));
zh=kShow(`{t:"tafel",z:"i",sy:kSylls(["a","i"],"i")}`);
ok("Silbentafel: 27 Silben mit Umschrift, ohne Audio nicht antippbar, Hinweis zur Umschrift",(zh.match(/class="kts"/g)||[]).length===27&&/<span class="ar" lang="ar">بِ<\/span><small>bi<\/small>/.test(zh)&&!/data-sy=/.test(zh)&&/kh für ch/.test(zh));
zh=kShow(`{t:"silbe",y:kSy(ALBY.ba,"i"),zk:["a","i"]}`);
ok("Silbe lesen: Silbe groß, vier Umschriften",/Wie liest man diese Silbe/.test(zh)&&/kgl" lang="ar">بِ</.test(zh)&&(zh.match(/class="opt  "/g)||[]).length===4&&/>bi</.test(zh));
zh=kShow(`{t:"silbewahl",y:kSy(ALBY.ba,"i"),zk:["a","i"]}`);
ok("Silbe wählen: Umschrift, vier arabische Silben",/„bi“/.test(zh)&&(zh.match(/class="opt ar /g)||[]).length===4);
run(`K.picked=K.T[K.n].ok;kAns(true);klek()`);
ok("… richtig: Silbe und Umschrift in der Rückmeldung",/Richtig: <span class="ar kfa" lang="ar">بِ<\/span> bi/.test(run(`app.innerHTML`)));
zh=kShow(`{t:"wortlesen",wo:kWs(K.l).find(w=>w.w==="سَمِعَ"),zk:["a","i"]}`);
ok("Wort lesen: Wort groß, Umschriften zur Auswahl, Bedeutung erst danach",/kwr" lang="ar">سَمِعَ/.test(zh)&&/>samiʿa</.test(zh)&&!/er hörte/.test(zh));
run(`K.picked=K.T[K.n].ok;kAns(true);klek()`);
ok("… danach mit Bedeutung",/samiʿa · er hörte/.test(run(`app.innerHTML`)));
zh=kShow(`{t:"luecke",wo:kWs(K.l).find(w=>w.w==="شَرِبَ"),g:2,zk:["a","i"]}`);
ok("Lücke: Buchstabe ohne Zeichen hervorgehoben, Umschrift zeigt den Klang, zwei Silben zur Wahl",/شَرِ<span class="kgp">ب<\/span>/.test(zh)&&/sha ri <b class="kgp">ba<\/b>|shari<b class="kgp">ba<\/b>/.test(zh)&&run(`K.T[K.n].opts.slice().sort().join()`)===["بَ","بِ"].sort().join(),run(`K.T[K.n].opts`));
zh=kShow(`{t:"bau",wo:kWs(K.l).find(w=>w.w==="شَرِبَ"),zk:["a","i"]}`);
ok("Bauen: Umschrift und Bedeutung, Silben-Kacheln plus Fallen",/Setze zusammen/.test(zh)&&/„shariba“<small>er trank<\/small>/.test(zh)&&/Tippe die 3 Silben/.test(zh)&&run(`K.T[K.n].bank.length`)===5&&run(`K.T[K.n].bank.filter(x=>["شَ","رِ","بَ"].includes(x.c)).length`)>=3);
run(`K.sel=["شَ","رِ","بَ"].map(c=>K.T[K.n].bank.find(x=>x.c===c).u);klek();$("#chk")`);
run(`kAns(K.sel.map(u=>K.T[K.n].bank[u].k).join()===["شَ","رِ","بَ"].join());klek()`);
ok("… richtig gebaut: Wort, Umschrift, Bedeutung",/Richtig: <span class="ar kfa" lang="ar">شَرِبَ<\/span> shariba · er trank/.test(run(`app.innerHTML`)));
zh=kShow(`{t:"bau",wo:{w:"قَرَأَ وَكَتَبَ",de:"er las und schrieb",lat:kTr("قَرَأَ وَكَتَبَ")},zk:["a","i","u","hamza"]}`);
ok("Bauen mit Sätzen: Wörter statt Silben",/Tippe die 2 Wörter/.test(zh)&&run(`K.T[K.n].bank.some(x=>x.c==="قَرَأَ")&&K.T[K.n].bank.some(x=>x.c==="وَكَتَبَ")&&K.T[K.n].bank.length>=3`));
run(`K.sel=[K.T[K.n].bank.find(x=>x.c==="وَكَتَبَ").u,K.T[K.n].bank.find(x=>x.c==="قَرَأَ").u];kAns(false);klek()`);zh=run(`app.innerHTML`);
ok("… falsch: richtige Reihenfolge als Kacheln, kommt am Ende wieder",/Richtig ist:<\/p><div class="sb ok kzs"[^>]*><span class="tk" lang="ar">قَرَأَ<\/span><span class="tk" lang="ar">وَكَتَبَ<\/span><\/div>/.test(zh)&&run(`K.T[K.T.length-1].t==="bau"&&K.T[K.T.length-1].bank===null`));
zh=kShow(`{t:"paare",syl:true,set:[kSy(ALBY.ba,"a"),kSy(ALBY.ba,"i")].map(y=>({i:y.k,c:y.t,n:y.lat,sp:null}))}`);
ok("Paare mit Silben: Silbe und Umschrift",/Ordne jeder Silbe ihre Umschrift zu/.test(zh)&&/data-p="Lba-i"/.test(zh)&&/>bi<\/button>/.test(zh));
// Nachsprechen
run(`K.T.splice(K.n,0,{t:"sprechen",wo:kWs(K.l)[0]});K.fb=null;K.rec=null;const n0=K.n;klek();globalThis.skipped=K.n>n0`);
ok("Nachsprechen ohne Mikrofon: Karte fällt weg",run(`skipped`)===true);
run(`navigator.mediaDevices={getUserMedia:()=>Promise.reject(new Error("no"))};window.MediaRecorder=function(){};MICNO=false;SPAUSE=0`);
zh=kShow(`{t:"sprechen",wo:kWs(K.l)[0]}`);
ok("Nachsprechen: Wort, Umschrift, Vorbild, Aufnehmen, Hinweis, „Gerade nicht sprechen“, Weiter frei",/Sprich nach/.test(zh)&&/shariba · er trank|· er/.test(zh)&&/id="sp"[^>]*>[\s\S]*?Vorbild/.test(zh)&&/id="mic"[^>]*>[\s\S]*?Aufnehmen/.test(zh)&&/bleibt auf deinem Gerät/.test(zh)&&/Gerade nicht sprechen/.test(zh)&&/id="nx" >Weiter/.test(zh));
await run(`kRec()`);zh=run(`app.innerHTML`);
ok("… Mikrofon verweigert: Hinweis statt Aufnahme-Knopf, später keine Sprechkarten mehr",/Mikrofon ist nicht verfügbar/.test(zh)&&!/id="mic"/.test(zh)&&run(`!kSpOk()`));
run(`MICNO=false;SPAUSE=Date.now()+15*60e3`);
ok("„Gerade nicht sprechen“ pausiert die Sprechkarten",run(`!kSpOk()`));
run(`SPAUSE=0;delete navigator.mediaDevices;delete window.MediaRecorder`);
// Durchspielen
run(`K=null;S.xp=0;${s2done}`);
for(const id of ["s3-1","s3-2","s3-3","s3-4","s3-5"]){run(`startK(KL.find(l=>l.id==="${id}"));playK([])`)}
zh=run(`app.innerHTML`);
ok("alle Lektionen von S3 durchgespielt, Ende der Etappe mit Text und weiter zu S4",run(`KL.filter(l=>l.e==="s3").every(l=>S.kp.d[l.id]===1)`)&&/Etappe „Kurze Vokale“ geschafft/.test(zh)&&/Wörter mit kurzen Vokalen lesen/.test(zh)&&/Weiter: Etappe S4, Endung -an/.test(zh)&&/<span>هُوَ مَعَكَ<\/span>|<span>/.test(zh));
for(const id of ["s4-1","s4-2","s4-3","s4-4"]){run(`startK(KL.find(l=>l.id==="${id}"));playK([])`)}
zh=run(`app.innerHTML`);
ok("alle Lektionen von S4 durchgespielt, danach ist die nächste Etappe in Arbeit",run(`KL.filter(l=>l.e==="s4").every(l=>S.kp.d[l.id]===1)`)&&/Etappe „Tanwin“ geschafft/.test(zh)&&/nächste Etappe ist in Arbeit/.test(zh));
run(`view="path";ui.hint=null;path()`);kh=run(`app.innerHTML`);
ok("Pfad S3: Ziel mit Umschrift und Übersetzung, sobald die Etappe geschafft ist",/data-kz="s3"[^>]*>هُوَ سَمِعَ وَفَهِمَ/.test(kh)&&/huwa samiʿa wafahima<br>Er hörte und verstand\./.test(kh)&&/rasama waladun shajaratan biqalamin/.test(kh));
run(`${s2done};path()`);kh=run(`app.innerHTML`);
ok("Pfad S3 vorher: Ziel ohne Lösung, Station zeigt ihr Wort, Label nennt das neue Zeichen",/Einen ersten Satz lesen/.test(kh)&&!/huwa samiʿa/.test(kh)&&/data-kl="s3-2"[^>]*><span class="nd"><span class="ar" lang="ar">شَرِبَ<\/span>/.test(kh)&&/Neu: Fatha/.test(kh)&&run(`kSm(KL.find(l=>l.id==="s3-5"))`)==="12 kurze Sätze");
run(`S.kp.d["s3-1"]=1;S.kp.d["s3-2"]=1;startK(null,"s3")`);
ok("Wiederholung S3: 12 Aufgaben aus geschafften Lektionen, ohne Karten",run(`view==="klek"&&K.T.length===12&&K.T.every(t=>!KCARD.includes(t.t))&&K.T.every(t=>!t.wo||KL.filter(l=>l.id==="s3-1"||l.id==="s3-2").some(l=>l.woerter.some(w=>w[0]===t.wo.w)))`));
run(`playK([])`);
ok("… Ende: Runde beendet",/Runde beendet/.test(run(`app.innerHTML`))&&/Wiederholung · Etappe S3/.test(run(`app.innerHTML`)));
const sbT=texts().filter(t=>t.id.startsWith("sb/")),kw=new Set(texts().map(t=>t.text));
ok("Vorleseliste: alle Silben (Vokale, Tanwin, Ta marbuta) und alle Wörter von S3 und S4",sbT.length===167&&kw.has("وَ")&&sbT.some(t=>t.id==="sb/tam-un"&&t.text==="ةٌ")&&sbT.some(t=>t.id==="sb/ba-an"&&t.text==="بًا")&&sbT.some(t=>t.id==="sb/hamza-i"&&t.text==="إِ")
  &&Object.values(kfiles).flatMap(f=>f.lektionen).filter(l=>l.art==="vokale").every(l=>l.woerter.every(w=>kw.has(w[0])))&&kw.has("هُوَ سَمِعَ وَفَهِمَ"),sbT.length);

console.log("\n"+pass+" OK, "+fail+" FAIL");
process.exit(fail?1:0);
