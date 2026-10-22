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
ok("Startseite zeigt die Statistik-Karte",/class="card mini"/.test(f)&&/Diese Woche/.test(f)&&/data-go="stats"/.test(f));
ok("Karte nennt gelernt/begonnen/fällig richtig",/<b>3<\/b><span>gelernt<\/span>/.test(f)&&new RegExp("<b>"+(run(`LES[0].w.length`)-3)+"</b><span>begonnen").test(f)&&new RegExp("<b>"+run(`dueN()`)+"</b><span>fällig").test(f),f.match(/mnums[\s\S]*?<\/div><\/button>/)?.[0].replace(/<[^>]+>/g," "));
ok("Wochenbalken: sieben Tage, heute markiert",(f.match(/<div class="(t)?"><i/g)||[]).length===7&&/<div class="t"><i/.test(f));
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
ok("Startseite bietet Sätze an",/Sätze/.test(run(`app.innerHTML`)));


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
ok("Zurücksetzen löscht auch den Abschnitt",/S\.aok="";S\.sent=\{\}/.test(fileSrc));
// Satzrunde aus dem Pfad
run(`S.box={};S.due={};S.sent={};S.aok="skip";LES.forEach(l=>l.w.forEach(id=>{S.box[id]=1;S.due[id]=Date.now()+864e5}));startSatz(1)`);
ok("Satzrunde aus dem Pfad: zuerst Sätze dieser Einheit",run(`Z.u===1&&Z.back==="path"&&Z.items.length===6&&Z.items.every(it=>it.s.st===1)`),run(`JSON.stringify(Z.items.map(it=>it.s.st))`));
ok("… Beenden führt zurück zum Lernpfad",/data-go="path"/.test(run(`app.innerHTML`)));
run(`S.sent={};startSatz()`);
ok("Sätze von der Startseite: Rücksprung zur Startseite",run(`Z.u===undefined&&Z.back==="home"`));
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

console.log("\n"+pass+" OK, "+fail+" FAIL");
process.exit(fail?1:0);
