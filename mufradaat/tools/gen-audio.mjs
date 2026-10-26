// Erzeugt die Audiodateien der App mit einer KI-Stimme (Text-to-Speech).
// Braucht Node 18 oder neuer, sonst nichts. Der Schlüssel kommt aus tools/.env (nicht im Git) oder aus der Umgebung.
//
//   node tools/gen-audio.mjs proben  --anbieter azure        10 Probewörter in mehreren Stimmen → audio-proben/index.html
//   node tools/gen-audio.mjs alle    --anbieter azure --stimme ar-SA-HamedNeural
//                                                             alle fehlenden oder geänderten Texte → audio/ und audio/audio.json
//   node tools/gen-audio.mjs liste                            nur audio/audio.json und audio/liste.csv neu schreiben (ohne Schlüssel),
//                                                             z. B. nachdem eigene Aufnahmen in audio/eigen/ gelegt wurden
// Weitere Schalter: --neu (alles neu erzeugen), --tempo -10% (Sprechtempo), --nur w/kitab,w/bayt (nur diese IDs),
//   --roh (Text ohne Aussprache-Korrektur vorlesen), bei "proben": --vergleich (jede Stimme mit und ohne Korrektur)
//
// Eigene Aufnahmen (Muttersprachler) haben immer Vorrang: Datei unter audio/eigen/<ID>.mp3 ablegen
// (z. B. audio/eigen/w/kitab.mp3, auch .m4a, .ogg, .wav), dann "liste" ausführen. Die IDs stehen in audio/liste.csv.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {texts,APP} from "./audio-texts.mjs";

const AUD=path.join(APP,"audio"),OWN=path.join(AUD,"eigen"),MAN=path.join(AUD,"audio.json");
const args=process.argv.slice(2),cmd=args[0]||"hilfe";
const opt=n=>{const i=args.indexOf("--"+n);return i<0?null:(args[i+1]&&!args[i+1].startsWith("--")?args[i+1]:true)};
// Schlüssel aus tools/.env lesen (Zeilen NAME=WERT)
try{for(const l of fs.readFileSync(path.join(APP,"tools",".env"),"utf8").split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,"")}}catch(e){}
const env=n=>{const v=process.env[n];if(!v){console.error(`Es fehlt ${n}. Trag ihn in mufradaat/tools/.env ein (eine Zeile: ${n}=...).`);process.exit(1)}return v};
const tempo=opt("tempo")||"-10%",pct=parseFloat(tempo)||0;
// Aussprache-Korrektur: Die Stimmen sprechen ein Wort am Ende in Pausalform und verschlucken dabei Endungen
// (سَيَّارَة → „sayyār“, كِتَابٌ → „kitāb“). Darum wird die Endung für die Stimme ausgeschrieben,
// so wie die Umschrift in der App sie zeigt: ة am Wortende → هْ (-ah), Tanwin → Vokal + نْ (-un, -in, -an).
// Angezeigt wird in der App weiter der normale Text.
const KORR="k1";
const spoken=t=>opt("roh")?t:t
  .replace(/([ًٌٍَُِ])ّ/g,"ّ$1") // Schadda vor den Vokal, damit die Regeln unten greifen
  .replace(/ة(?=[\s.,،؟!?]|$)/g,"هْ")
  .replace(/ًا|اً/g,"َنْ").replace(/ً/g,"َنْ").replace(/ٌ/g,"ُنْ").replace(/ٍ/g,"ِنْ");
const esc=t=>t.replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"})[c]);

// ---------- Anbieter ----------
const P={
  azure:{ // Microsoft Azure AI Speech: Neural-Stimmen für Hocharabisch. Kostenlose Stufe F0: 0,5 Mio. Zeichen im Monat
    stimmen:["ar-SA-HamedNeural","ar-SA-ZariyahNeural","ar-AE-HamdanNeural","ar-AE-FatimaNeural","ar-JO-TaimNeural","ar-JO-SanaNeural"],
    async say(text,voice){
      const region=env("AZURE_SPEECH_REGION"),lang=voice.slice(0,5);
      const ssml=`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}"><prosody rate="${tempo}">${esc(text)}</prosody></voice></speak>`;
      const r=await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:"POST",headers:{"Ocp-Apim-Subscription-Key":env("AZURE_SPEECH_KEY"),"Content-Type":"application/ssml+xml","X-Microsoft-OutputFormat":"audio-24khz-48kbitrate-mono-mp3","User-Agent":"mufradaat"},body:ssml});
      return answer(r);
    }},
  google:{ // Google Cloud Text-to-Speech
    stimmen:["ar-XA-Wavenet-B","ar-XA-Wavenet-A","ar-XA-Wavenet-C","ar-XA-Wavenet-D","ar-XA-Chirp3-HD-Charon","ar-XA-Chirp3-HD-Kore"],
    async say(text,voice){
      const audioConfig={audioEncoding:"MP3"};if(!/Chirp/.test(voice))audioConfig.speakingRate=1+pct/100;
      const r=await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(env("GOOGLE_TTS_KEY"))}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:{text},voice:{languageCode:"ar-XA",name:voice},audioConfig})});
      if(!r.ok)return answer(r);return Buffer.from((await r.json()).audioContent,"base64");
    }},
  elevenlabs:{ // ElevenLabs: Stimmen-IDs aus der eigenen Voice Library (Standard: zwei vorgefertigte Stimmen)
    stimmen:["JBFqnCBsd6RMkjVDRZzb","21m00Tcm4TlvDq8ikWAM"],
    async say(text,voice){
      const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`,{method:"POST",headers:{"xi-api-key":env("ELEVENLABS_API_KEY"),"Content-Type":"application/json"},body:JSON.stringify({text,model_id:"eleven_multilingual_v2",voice_settings:{stability:.6,similarity_boost:.75,speed:Math.max(.7,1+pct/100)}})});
      return answer(r);
    }},
  openai:{ // OpenAI: in der App muss erkennbar sein, dass die Stimme KI-erzeugt ist
    stimmen:["onyx","nova","coral","ash"],
    async say(text,voice){
      const r=await fetch("https://api.openai.com/v1/audio/speech",{method:"POST",headers:{Authorization:"Bearer "+env("OPENAI_API_KEY"),"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4o-mini-tts",voice,input:text,response_format:"mp3",instructions:"Lies den Text in klarem Hocharabisch (Fusha) vor, genau mit den angegebenen Vokalzeichen, langsam und deutlich wie für Sprachlernende."})});
      return answer(r);
    }},
};
async function answer(r){if(r.ok)return Buffer.from(await r.arrayBuffer());const e=new Error(`${r.status} ${(await r.text()).slice(0,300)}`);e.status=r.status;throw e}
async function retry(f){for(let i=0;;i++){try{return await f()}catch(e){if(i>=4||!(e.status===429||e.status>=500||!e.status))throw e;await new Promise(r=>setTimeout(r,1000*2**i))}}}
const provider=()=>{const n=opt("anbieter")||"azure";if(!P[n]){console.error("Unbekannter Anbieter "+n+". Möglich: "+Object.keys(P).join(", "));process.exit(1)}return [n,P[n]]};
const md5=b=>crypto.createHash("md5").update(b).digest("hex").slice(0,8);
const write=(f,b)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b)};

// ---------- Befehle ----------
// Probewörter mit schwierigen Lauten: ʿAyn, ḥ, q, emphatische Laute, Hamza, Schadda, Artikel, Alif maqṣūra
const PROBEN=["w/ayn","w/halib","w/qalb","w/taam","w/zahr","w/khubz","w/sayyarah","w/madrasah","w/suaal","w/mustashfa","w/sabah-al-khayr","w/shukran"];
async function proben(){
  const [n,p]=provider(),all=texts(),list=PROBEN.map(id=>all.find(t=>t.id===id)).filter(Boolean);
  list.push(...all.filter(t=>t.id.startsWith("s/")).filter((t,k,a)=>k<2||t===a.find(x=>[...x.text].length>25))); // dazu drei Sätze
  const base=typeof opt("stimme")==="string"?opt("stimme").split(","):p.stimmen,dir=path.join(APP,"audio-proben");
  const voices=opt("vergleich")?base.flatMap(v=>[v+"~roh",v]):base; // ~roh: ohne Aussprache-Korrektur
  for(const c of voices)for(const t of list){
    const [v,raw]=c.split("~"),f=path.join(dir,c,t.id.replace("/","-")+".mp3"),txt=raw?t.text:spoken(t.text);
    try{write(f,await retry(()=>p.say(txt,v)));process.stdout.write(".")}catch(e){console.error(`\n${c} ${t.id}: ${e.message}`)}
  }
  const cell=(v,t)=>fs.existsSync(path.join(dir,v,t.id.replace("/","-")+".mp3"))?`<audio controls preload="none" src="${v}/${t.id.replace("/","-")}.mp3"></audio>`:"–";
  write(path.join(dir,"index.html"),`<!doctype html><meta charset="utf-8"><title>Stimmproben ${n}</title><style>body{font:15px system-ui;margin:24px}td,th{padding:6px 10px;border-bottom:1px solid #ddd;text-align:left}.ar{font-size:24px}audio{width:150px}</style>
<h1>Stimmproben: ${n}, Tempo ${tempo}</h1><table><tr><th>Deutsch</th><th>Arabisch</th>${voices.map(v=>`<th>${v}</th>`).join("")}</tr>
${list.map(t=>`<tr><td>${esc(t.de)}</td><td class="ar" dir="rtl" lang="ar">${t.text}</td>${voices.map(v=>`<td>${cell(v,t)}</td>`).join("")}</tr>`).join("\n")}</table>`);
  console.log(`\nFertig. Öffne ${path.join(dir,"index.html")} im Browser und vergleiche die Stimmen.`);
}
const ownFile=id=>[".mp3",".m4a",".ogg",".wav"].map(x=>path.join(OWN,id+x)).find(f=>fs.existsSync(f));
const readMan=()=>{try{return JSON.parse(fs.readFileSync(MAN,"utf8"))}catch(e){return {items:{}}}};
function manifest(gen){ // gen: ID → {f,q} der KI-Dateien
  const items={},rows=[["ID","Deutsch","Arabisch","Quelle","Datei für eigene Aufnahme"]];let own=0,ai=0,none=0;
  for(const t of texts()){
    const o=ownFile(t.id);let e=null;
    if(o){e={f:path.relative(AUD,o).split(path.sep).join("/"),q:"eigen"};own++}
    else if(gen[t.id]&&gen[t.id].t===t.text&&fs.existsSync(path.join(AUD,gen[t.id].f))){e={f:gen[t.id].f,q:gen[t.id].q};ai++}
    else none++;
    if(e){e.v=md5(fs.readFileSync(path.join(AUD,e.f)));e.i=t.id;items[t.text]=e}
    rows.push([t.id,t.de,t.text,e?e.q:"fehlt","audio/eigen/"+t.id+".mp3"]);
  }
  // Schlüssel = genauer arabischer Text, so wie die App ihn vorliest; i = ID, f = Datei, v = Prüfsumme (für den Cache), q = Quelle
  write(MAN,JSON.stringify({items},null,0).replace(/\},"/g,'},\n"')+"\n");
  write(path.join(AUD,"liste.csv"),"﻿"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(";")).join("\r\n")+"\r\n");
  console.log(`audio.json: ${ai} KI-Stimme, ${own} eigene Aufnahmen, ${none} ohne Audio (dort liest weiter die Gerätestimme).`);
}
const genOf=m=>Object.fromEntries(Object.entries(m.items).filter(([,e])=>e.q!=="eigen").map(([t,e])=>[e.i,{f:e.f,q:e.q,t}]));
async function alle(){
  const [n,p]=provider(),voice=typeof opt("stimme")==="string"?opt("stimme"):p.stimmen[0],q=`${n}:${voice}:${tempo}:${opt("roh")?"roh":KORR}`;
  const gen=genOf(readMan()),only=typeof opt("nur")==="string"?new Set(opt("nur").split(",")):null;
  const todo=texts().filter(t=>(!only||only.has(t.id))&&!ownFile(t.id)&&(opt("neu")||!gen[t.id]||gen[t.id].t!==t.text||gen[t.id].q!==q||!fs.existsSync(path.join(AUD,gen[t.id].f))));
  console.log(`${todo.length} Texte mit ${voice} erzeugen (${todo.reduce((s,t)=>s+[...t.text].length,0)} Zeichen) …`);
  let k=0,bad=0;const queue=[...todo];
  await Promise.all([0,1,2,3].map(async()=>{for(let t;(t=queue.shift());){
    const f=t.id+".mp3";
    try{write(path.join(AUD,f),await retry(()=>p.say(spoken(t.text),voice)));gen[t.id]={f,q,t:t.text}}catch(e){bad++;console.error(`\n${t.id} (${t.text}): ${e.message}`)}
    if(++k%20===0)process.stdout.write(` ${k}`);
  }}));
  console.log(bad?`\n${bad} Fehler, einfach erneut ausführen.`:"\nFertig.");
  manifest(gen);
}
if(cmd==="proben")await proben();
else if(cmd==="alle")await alle();
else if(cmd==="liste")manifest(genOf(readMan()));
else console.log(fs.readFileSync(new URL(import.meta.url),"utf8").split("\n").filter(l=>l.startsWith("//")).map(l=>l.slice(3)).join("\n"));
