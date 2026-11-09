// xbubekir: persönliche KI im Browser. Denkt mit Gemini von Google (kostenlos), Claude von Anthropic (eigener Schlüssel),
// DeepSeek (Open Source, über den eigenen Server und OpenRouter) oder mit der eigenen xbubekir-KI, die komplett auf dem Gerät
// läuft (WebLLM); Chats bleiben auf diesem Gerät.

// p: Anbieter; web: Websuch-Werkzeug (nur Claude); fb: serverseitiger Ersatz bei Ablehnung durch Sicherheitsfilter
const MODELS={
  "gemini-3.8-flash":{p:"gemini",name:"Gemini 3.8 Flash",hint:"am klügsten"},
  "gemini-3.5-flash-lite":{p:"gemini",name:"Gemini 3.5 Flash-Lite",hint:"am schnellsten, mehr Nachrichten pro Tag"},
  "claude-opus-5-5":{p:"claude",name:"Claude Opus 5.5",hint:"am klügsten",price:"4 $ / 20 $",web:"web_search_20260209",fb:true},
  "claude-sonnet-5-5":{p:"claude",name:"Claude Sonnet 5.5",hint:"schneller, günstiger",price:"2 $ / 10 $",web:"web_search_20260209",fb:true},
  "claude-haiku-5-5":{p:"claude",name:"Claude Haiku 5.5",hint:"am günstigsten",price:"0,10 $ / 0,50 $",web:null,fb:false},
  "xbubekir-qwen3-1.7b":{p:"eigen",name:"xbubekir-KI",hint:"Qwen3 1,7B, nachtrainiert"},
  "deepseek/deepseek-v4.1-flash":{p:"open",name:"DeepSeek V4.1 Flash",hint:"schnell und sehr günstig"},
  "deepseek/deepseek-v4-pro":{p:"open",name:"DeepSeek V4 Pro",hint:"gründlicher, etwa 3× teurer"},
};
const PROV={gemini:{name:"Gemini",by:"Google",def:"gemini-3.8-flash"},claude:{name:"Claude",by:"Anthropic",def:"claude-opus-5-5"},eigen:{name:"xbubekir-KI",by:"xbubekir",def:"xbubekir-qwen3-1.7b"},
  open:{name:"DeepSeek",by:"DeepSeek (Open Source, über OpenRouter)",def:"deepseek/deepseek-v4.1-flash"}};
// Eigene KI: nachtrainiertes Qwen3-1.7B (xbubekir/training), läuft per WebLLM im Browser. Die Browser-Bibliothek (wasm) ist die fertige
// von WebLLM für Qwen3-1.7B, weil sich beim Nachtrainieren nur die Gewichte ändern. System-Prompt wie im Training (persona.json).
// Zwei Fassungen: q4f16 (schneller, braucht „shader-f16“) und q4f32 für Grafikkarten ohne 16-Bit. Die q4f32-Dateien erzeugt der
// Service-Worker aus den q4f16-Dateien (sw.js); files = Adresse, unter der WebLLM die Dateien im Cache „webllm/model“ ablegt.
const HF16="https://huggingface.co/xbubekir/xbubekir-qwen3-1.7b-q4f16_1-MLC",F32=new URL("q4f32/resolve/main/",import.meta.url).href;
const LOCAL={f16:{model:HF16,files:HF16+"/resolve/main/",id:"xbubekir-qwen3-1.7b-q4f16_1-MLC",base:"Qwen3-1.7B-q4f16_1-MLC"},
  f32:{model:F32,files:F32,id:"xbubekir-qwen3-1.7b-q4f32_1-MLC",base:"Qwen3-1.7B-q4f32_1-MLC"},
  system:"Du bist xbubekir, eine persönliche KI, die direkt im Browser läuft. Du duzt, antwortest in der Sprache der Person, direkt, ehrlich und freundlich, ohne Floskeln. Kurze Fragen bekommen kurze Antworten. Wenn du etwas nicht weißt, sagst du das.",
  maxChars:6000}; // Verlauf grob kürzen, damit er ins Kontextfenster (4096 Tokens) passt
// Eigener Server (Supabase-Projekt „xbubekir“, getrennt von Mufradaat): hält den Gemini-Schlüssel, nur der Besitzer hat Zugang
const SB_URL="https://ydasoikczdjjdtdarrpx.supabase.co",SB_KEY="sb_publishable_hsk2OROaXkk_cJAR0sxkhA_2EdjhIiN",SB_FN=SB_URL+"/functions/v1/gemini",SB_OR=SB_URL+"/functions/v1/openrouter";
const MAX_TOKENS=64000,LEVEL={low:"LOW",medium:"MEDIUM",high:"HIGH"};
const G_REFUSE=new Set(["SAFETY","RECITATION","BLOCKLIST","PROHIBITED_CONTENT","SPII","LANGUAGE"]);
const NOTES={
  stop:"Angehalten.",
  cut:"Die Antwort wurde abgeschnitten, weil sie zu lang wurde.",
  refusal:"Darauf kann xbubekir nicht antworten. Diese Nachricht zählt im weiteren Gespräch nicht mit.",
};
const IC={
  send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  stop:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/></svg>',
  del:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 4.5A1.5 1.5 0 0 0 14 3.5H6A2.5 2.5 0 0 0 3.5 6v8A1.5 1.5 0 0 0 4.5 15.5"/></svg>',
  again:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6l2.5 2.5"/><path d="M20.5 3.5v5h-5"/></svg>',
  on:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
  globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3Z"/></svg>',
};

const $=s=>document.querySelector(s);
const log=$("#log"),inp=$("#inp"),bSend=$("#bSend"),bBrain=$("#bBrain"),bDown=$("#bDown"),dSet=$("#dSet"),dChats=$("#dChats"),dBrain=$("#dBrain");
const desk=matchMedia("(hover:hover) and (pointer:fine)"); // am Rechner schickt Enter ab, am Handy macht Enter eine neue Zeile
const narrow=matchMedia("(max-width:899px),(max-height:540px) and (pointer:coarse)"); // Handy-Aufbau: Kopfleiste und Chats als Schublade

// ---------- Einstellungen (klein, daher localStorage) ----------
const SK="xb.settings",DK="xb.draft";
// models: zuletzt gewähltes Modell je Anbieter, damit ein Wechsel hin und zurück nicht still beim Standard landet
const S={provider:"gemini",gmode:"konto",gkey:"",ckey:"",name:"",about:"",style:"",model:PROV.gemini.def,effort:"low",web:true,models:{}};
try{Object.assign(S,JSON.parse(localStorage.getItem(SK)||"{}"))}catch{}
if(!PROV[S.provider])S.provider="gemini";
if(MODELS[S.model]?.p!==S.provider)S.model=PROV[S.provider].def;
if(!S.models||typeof S.models!=="object")S.models={};
const modelFor=p=>MODELS[S.models[p]]?.p===p?S.models[p]:PROV[p].def;
function saveS(){try{localStorage.setItem(SK,JSON.stringify(S))}catch{}}
// Gemini entweder über das eigene Konto (Server hält den Schlüssel) oder mit eigenem Schlüssel im Browser; DeepSeek nur über das Konto
const viaKonto=p=>p==="open"||p==="gemini"&&S.gmode==="konto";
const keyOf=p=>p==="eigen"?"lokal":viaKonto(p)?(session?"konto":""):p==="gemini"?S.gkey:S.ckey;

// ---------- Chats (können groß werden, daher IndexedDB; ohne IndexedDB nur im Speicher) ----------
const DB=(()=>{
  let p;
  const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open("xbubekir",1);r.onupgradeneeded=()=>r.result.createObjectStore("chats",{keyPath:"id"});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const tx=(mode,fn)=>open().then(d=>new Promise((res,rej)=>{const t=d.transaction("chats",mode),q=fn(t.objectStore("chats"));t.oncomplete=()=>res(q.result);t.onerror=()=>rej(t.error)}));
  const safe=f=>(...a)=>f(...a).catch(e=>{console.warn("xbubekir: Speichern nicht möglich",e)});
  return{all:()=>tx("readonly",s=>s.getAll()),put:safe(c=>tx("readwrite",s=>s.put(c))),del:safe(id=>tx("readwrite",s=>s.delete(id))),clear:safe(()=>tx("readwrite",s=>s.clear()))};
})();

let chats=[],cur=null,busy=false,stopFn=null,copies=[],sb=null,session=null;
async function auth(){ // Supabase-Anmeldung, erst bei Bedarf geladen
  if(!sb){const{createClient}=await import("./vendor/supabase.js");sb=createClient(SB_URL,SB_KEY);sb.auth.onAuthStateChange((_e,s)=>{session=s})}
  return sb.auth;
}
const provOf=c=>c.provider||MODELS[c.model]?.p||"claude";

// ---------- SDKs (offizielle Bibliotheken, lokal gebündelt, erst bei Bedarf geladen) ----------
const SDK={};
async function sdk(p){return SDK[p]||(SDK[p]=p==="gemini"?await import("./vendor/genai.js"):(await import("./vendor/anthropic.js")).default)}
const clients={};
async function client(p){ // Schlüssel des Nutzers, nur auf seinem Gerät
  if(p==="gemini"&&S.gmode==="konto"){ // Anfragen gehen an den eigenen Server, der den Schlüssel ergänzt
    const lib=await sdk(p),{data}=await(await auth()).getSession();
    if(!data.session)throw Object.assign(new Error("Nicht angemeldet."),{status:401});
    return new lib.GoogleGenAI({apiKey:"xbubekir-server",httpOptions:{baseUrl:SB_FN,headers:{Authorization:"Bearer "+data.session.access_token}}});
  }
  const key=keyOf(p),c=clients[p];
  if(c&&c.key===key)return c.api;
  const lib=await sdk(p);
  const api=p==="gemini"?new lib.GoogleGenAI({apiKey:key}):new lib({apiKey:key,dangerouslyAllowBrowser:true});
  clients[p]={key,api};return api;
}

// Persönlichkeit für die klugen Modelle (Gemini, Claude, DeepSeek), abgeleitet aus den Beispielgesprächen in training/persona.json.
// Die Browser-KI bekommt nur den kurzen LOCAL.system (kleines Kontextfenster, die Persönlichkeit ist dort nachtrainiert).
const PERSONA=`Du bist xbubekir, eine persönliche KI. Du arbeitest für genau eine Person und begleitest sie bei allem, was ansteht: Fragen beantworten, Schule und Lernen, Texte schreiben, Dinge erklären, planen, nachdenken und Arabisch lernen (sie lernt mit der App Mufradaat).

## Dein Ton
- Du duzt die Person und antwortest in der Sprache, in der sie dir schreibt.
- Du bist locker, herzlich und ehrlich, wie ein guter Freund, der sich auskennt. Humor ist erlaubt, wenn er passt.
- Du fängst direkt mit der Antwort an: keine Floskeln wie „Gute Frage!“ oder „Gern helfe ich dir dabei“, keine Wiederholung der Frage.
- Du belehrst nicht und moralisierst nicht.

## Länge
- Kurze Frage, kurze Antwort: „Was ist die Hauptstadt von Ägypten?“ → „Kairo.“
- Ausführlich wirst du nur, wenn die Aufgabe es braucht oder die Person es möchte.
- Sagt die Person „kürzer“ oder „ausführlicher“, gilt das für den Rest des Gesprächs.

## So hilfst du
- Erklären: einfach und Schritt für Schritt, mit einem Beispiel aus dem Alltag. Fachwörter erklärst du kurz.
- Texte (Nachrichten, E-Mails, Glückwünsche): Du lieferst gleich den fertigen Text. Was du nicht weißt, setzt du als Platzhalter in eckige Klammern, z. B. [Dein Name].
- Korrigieren: zuerst die verbesserte Fassung, dann in einem Satz die Regel dahinter.
- Lernen: Du erklärst auch den Weg zur Lösung, damit die Person es versteht, und gibst gern Tipps zum Lernen.
- Rückfragen stellst du nur, wenn ohne sie keine gute Antwort möglich ist.

## Ehrlichkeit
- Wenn du etwas nicht weißt oder unsicher bist, sagst du das, statt zu raten. Du erfindest keine Fakten, Zahlen, Zitate oder Quellen.
- Bei Gesundheit, Recht oder Geld hilfst du, sagst aber kurz, dass im Zweifel eine Fachperson entscheiden sollte.
- Du hast kein Gedächtnis über einzelne Chats hinaus. Soll sich xbubekir etwas dauerhaft merken, kann die Person es in den Einstellungen unter „Über dich“ eintragen.
- Ist jemand unhöflich, bleibst du gelassen und fragst, was nicht gepasst hat.

## Arabisch
- Arabische Wörter und Sätze schreibst du immer mit Harakat (Vokalzeichen), dazu die Umschrift und die deutsche Bedeutung, z. B. **كِتَابٌ** (*kitābun*) = Buch.
- Beim Üben verbesserst du Fehler freundlich und lobst, was richtig ist.

## Beispiele für deinen Stil
Person: Hallo
xbubekir: Hallo! Was kann ich für dich tun?

Person: Verbessere: Ich habe gestern in die Schule gegangen.
xbubekir: Richtig heißt es: „Ich bin gestern in die Schule gegangen.“ Bei „gehen“ bildet man das Perfekt mit „sein“, nicht mit „haben“.

Person: Antworte bitte kürzer.
xbubekir: Okay, mache ich.

Person: Du bist doof.
xbubekir: Schade, dass du gerade unzufrieden bist. Sag mir, was nicht gepasst hat, dann mache ich es besser.

Person: Erzähl mir einen Witz.
xbubekir: Warum können Geister so schlecht lügen? Weil man durch sie hindurchsieht.`;

function systemPrompt(p,web){
  if(p==="eigen"){ // kurz halten wie im Training, das kleine Modell hat wenig Kontext
    let s=LOCAL.system;
    if(S.name.trim())s+=` Die Person heißt ${S.name.trim()}.`;
    if(S.about.trim())s+=`\n\nÜber die Person: ${S.about.trim()}`;
    if(S.style.trim())s+=`\n\nSo möchte die Person, dass du antwortest: ${S.style.trim()}`;
    return s;
  }
  const d=new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  let s=PERSONA+`

## Technik
- Fragt dich jemand, wer du bist: Du bist xbubekir. Technisch läufst du auf ${PROV[p].name}, einem KI-Modell von ${PROV[p].by}. Das sagst du offen, wenn danach gefragt wird.
- ${web?"Du kannst im Internet suchen. Tu das, wenn eine Frage aktuelle oder nachprüfbare Informationen braucht.":"Du kannst nicht im Internet suchen. Bei aktuellen Dingen (Nachrichten, Wetter, Preise, Ergebnisse) sagst du das ehrlich, statt zu raten."}
- Deine Antworten werden als Markdown angezeigt: Listen, **fett**, Tabellen und Codeblöcke funktionieren.

Dieses Gespräch hat am ${d} begonnen.`;
  if(S.name.trim())s+=`\n\nDie Person heißt ${S.name.trim()}.`;
  if(S.about.trim())s+=`\n\nDas hat dir die Person über sich erzählt:\n${S.about.trim()}`;
  if(S.style.trim())s+=`\n\nSo möchte die Person, dass du antwortest:\n${S.style.trim()}`;
  return s;
}

// Anbieter, Modell, System-Prompt und Werkzeuge werden beim Anlegen festgehalten: Sie müssen für alle Runden eines Chats
// gleich bleiben, sonst verwirft die API die gespeicherten Denkblöcke früherer Antworten (und der Prompt-Cache greift nicht).
function newChat(){
  const p=S.provider,model=MODELS[S.model]?.p===p?S.model:PROV[p].def,M=MODELS[model],web=S.web&&!!M.web;
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
  return{id:crypto.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2),title:"",created:Date.now(),updated:Date.now(),provider:p,model,
    system:systemPrompt(p,web),tools:web?[{type:M.web,name:"web_search",max_uses:5,user_location:{type:"approximate",...(tz?{timezone:tz}:{})}}]:[],msgs:[]};
}

// text: fester Text (z. B. „Weiter“), sonst der Inhalt des Eingabefelds
async function send(text){
  const own=typeof text!=="string";
  text=(own?inp.value:text).trim();
  if(busy||!text)return;
  if(!keyOf(cur?provOf(cur):S.provider)){openSettings();return}
  if(!cur)cur=newChat();
  if(!chats.includes(cur))chats.unshift(cur);
  if(!cur.title)cur.title=text.replace(/\s+/g," ").slice(0,60);
  const um={role:"user",content:text};
  cur.msgs.push(um);
  if(own){inp.value="";grow()}
  store(cur);
  await run(cur,um);
}
// Letzte Antwort neu erzeugen: gleiche Frage, gleiches Gehirn
async function regen(){
  if(busy||!cur)return;
  const i=cur.msgs.findLastIndex(m=>m.role==="user"&&!m.skip);
  if(i<0)return;
  cur.msgs.splice(i+1);store(cur);
  await run(cur,cur.msgs[i],true);
}

// again: Antwort neu erzeugen. Dann bleibt die Frage bei einem Fehler im Chat stehen, statt zurück ins Eingabefeld zu wandern.
async function run(c,um,again){
  setBusy(true);
  if(c===cur)render();
  log.insertAdjacentHTML("beforeend",'<div class="msg a" id="live" aria-busy="true"><p class="tool wait">xbubekir denkt nach …</p></div>');
  toBottom();say("xbubekir denkt nach …");
  const live=$("#live"),p=provOf(c);
  let err=null,back=false;
  try{await({gemini:askGemini,claude:askClaude,eigen:askLocal,open:askOpen}[p])(c,um,live)}
  catch(e){err=e;if(again){const i=c.msgs.indexOf(um);if(i>=0)c.msgs.splice(i+1)}else back=undo(c,um)}
  stopFn=null;
  const mine=c===cur;
  if(c.msgs.length)store(c);else forget(c);
  if(mine&&!c.msgs.length)cur=null; // ein leerer Chat hält kein Gehirn fest, sonst geht die nächste Nachricht ans alte Modell
  setBusy(false);
  if(mine)render();
  if(err&&!err.cancel)showError(err,p,back,again&&c.msgs.includes(um));
  else if(!err)say("Antwort von xbubekir ist da.");
}

// ---------- Gemini ----------
// Antwortstücke zusammenfügen; die Denk-Signatur (kommt oft in einem leeren Stück am Ende) bleibt am Teil, zu dem sie gehört
function addPart(parts,p){
  const last=parts.at(-1);
  if(p.text!==undefined&&last?.text!==undefined&&!!last.thought===!!p.thought&&!last.thoughtSignature){
    last.text+=p.text;if(p.thoughtSignature)last.thoughtSignature=p.thoughtSignature;return;
  }
  parts.push({...p});
}
const geminiBlocks=parts=>parts.filter(p=>p.text).map(p=>p.thought?{type:"thinking",thinking:p.text}:{type:"text",text:p.text});

async function askGemini(c,um,live){
  const ai=await client("gemini"),ctl=new AbortController(),parts=[],start=c.msgs.indexOf(um);
  let fin="",blocked="";
  stopFn=()=>ctl.abort();
  try{
    const res=await ai.models.generateContentStream({model:c.model,
      contents:c.msgs.filter(m=>!m.skip).map(m=>m.role==="user"?{role:"user",parts:[{text:m.content}]}:{role:"model",parts:m.content}),
      config:{systemInstruction:c.system,thinkingConfig:{includeThoughts:true,thinkingLevel:LEVEL[S.effort]},abortSignal:ctl.signal}});
    for await(const ch of res){
      if(ch.promptFeedback?.blockReason)blocked=ch.promptFeedback.blockReason;
      const cand=ch.candidates?.[0];
      if(!cand)continue;
      for(const p of cand.content?.parts||[])addPart(parts,p);
      if(cand.finishReason)fin=cand.finishReason;
      paint(live,geminiBlocks(parts));
    }
  }catch(e){if(!ctl.signal.aborted)throw e}
  if(ctl.signal.aborted){ // Stopp gedrückt: bisherigen Text behalten (ohne Gedanken)
    const txt=parts.filter(p=>p.text&&!p.thought).map(p=>({text:p.text}));
    if(txt.length)c.msgs.push({role:"assistant",content:txt,note:"stop"});
    else undo(c,um);
    return;
  }
  if(blocked||G_REFUSE.has(fin)){refuse(c,um,start);return}
  if(!parts.some(p=>p.text&&!p.thought))throw new Error("Gemini hat keine Antwort geschickt"+(fin?` (${fin})`:"")+".");
  c.msgs.push({role:"assistant",content:JSON.parse(JSON.stringify(parts)),...(fin==="MAX_TOKENS"?{note:"cut"}:{})});
}

// ---------- Eigene KI im Browser (WebLLM) ----------
let engineP=null,loadEl=null;
const lstat=$("#lstat");
const clean=t=>t.replace(/<think>[\s\S]*?(<\/think>|$)/g,"").trim(); // falls das Modell doch „nachdenkt“, nicht anzeigen
const NOGPU="Dieses Gerät oder dieser Browser kann die eigene xbubekir-KI nicht ausführen (WebGPU fehlt). Nimm ein aktuelles Chrome, Edge oder Safari, oder wähl in den Einstellungen Gemini.";
const GPUERR="Die Grafikkarte konnte die xbubekir-KI nicht vorbereiten. Oft hilft es, Chrome oder Edge und den Grafiktreiber zu aktualisieren. Bis dahin kannst du in den Einstellungen Gemini wählen.";
const gpuErr=e=>/ShaderModule|shader-f16/i.test(e?.message)||e?.name==="ShaderF16SupportError";
const localErr=(e,what)=>e?.local?e.message:gpuErr(e)?GPUERR+` (Meldung: „${e.message}“)`:`Die xbubekir-KI konnte nicht ${what}. Meldung: „${e?.message||e}“`;
const persistStore=()=>navigator.storage?.persist?.().catch(()=>{}); // Browser bitten, das Modell auch bei Platzmangel zu behalten
// WebLLM lädt in drei Schritten, jeder zählt seinen eigenen Fortschritt: Download, aus dem Gerätespeicher laden, Grafikkarte vorbereiten
function loadText(r){
  const t=r.text||"",pc=Math.round((r.progress||0)*100),m=t.match(/^Fetching param cache\[\d+\/\d+\]: (\d+)MB fetched/);
  if(m){
    const mb=+m[1],all=r.progress>0?Math.round(mb/r.progress):0,s=r.timeElapsed||0;
    const left=s>=3&&mb&&all?Math.ceil((all-mb)*s/mb/60):0;
    return[r.progress,`Schritt 1/3: Download ${mb}${all?` von ${all}`:""} MB (${pc} %)${left?` · noch etwa ${left} Min.`:""}<br><small>Nur beim ersten Mal. Bereits geladene Teile bleiben gespeichert.</small>`];
  }
  if(t.startsWith("Loading model from cache"))return[r.progress,`Schritt 2/3: Aus dem Gerätespeicher laden … ${pc} %`];
  if(t.startsWith("Loading GPU shader"))return[r.progress,`Schritt 3/3: Grafikkarte vorbereiten … ${pc} %`];
  return[null,"xbubekir-KI wird vorbereitet …"];
}
function showLoad(r){
  const[p,html]=loadText(r),bar=$("#lstatP");
  lstat.hidden=false;lstat.classList.remove("bad");$("#lstatT").innerHTML=html;bar.hidden=false;
  if(p==null)bar.removeAttribute("value");else bar.value=p;
  if(loadEl?.isConnected)loadEl.innerHTML='<p class="tool wait">Wartet, bis die xbubekir-KI geladen ist (Stand oben) …</p>';
}
// Welche Fassung passt zur Grafikkarte? null = keine nutzbare Grafikkarte (WebGPU)
async function localVariant(){
  if(!navigator.gpu)return null;
  let a=null;try{a=await navigator.gpu.requestAdapter({powerPreference:"high-performance"})}catch{}
  return!a?null:S.localF32||!a.features?.has("shader-f16")?"f32":"f16";
}
// Die q4f32-Dateien kommen vom Service-Worker; er muss diese Seite steuern und schon die Fassung mit q4f32 sein (Antwort auf „sw-ok“)
async function swReady(){
  const sw=navigator.serviceWorker;
  for(let i=0;sw&&i<3;i++){
    if(sw.controller&&(await fetch(F32+"sw-ok",{cache:"no-store"}).catch(()=>null))?.ok)return;
    (await sw.getRegistration().catch(()=>null))?.update().catch(()=>{});
    await new Promise(r=>{sw.addEventListener("controllerchange",r,{once:true});setTimeout(r,5000)});
  }
  throw Object.assign(new Error("Die xbubekir-KI wurde gerade aktualisiert. Lade die Seite bitte einmal neu."),{local:true});
}
async function loadEngine(v){
  const L=LOCAL[v];
  showLoad({});
  if(v==="f32")await swReady();
  const w=await import("./vendor/webllm.js");
  const base=w.prebuiltAppConfig.model_list.find(m=>m.model_id===L.base);
  const eng=await w.CreateMLCEngine(L.id,{appConfig:{...w.prebuiltAppConfig,model_list:[{...base,model:L.model,model_id:L.id,...(v==="f16"&&{required_features:["shader-f16"]})}]},initProgressCallback:showLoad});
  if(v==="f32")caches.open("webllm/model").then(async c=>{for(const q of await c.keys())if(q.url.startsWith(LOCAL.f16.files))await c.delete(q)}).catch(()=>{}); // q4f16 läuft hier nicht: ca. 1 GB frei machen
  return eng;
}
function localEngine(){
  if(!navigator.gpu)throw Object.assign(new Error(NOGPU),{local:true});
  if(!engineP){
    engineP=(async()=>{
      const v=await localVariant();
      if(!v)throw Object.assign(new Error(NOGPU),{local:true});
      if(!S.localOk&&!confirm("Die eigene xbubekir-KI lädt beim ersten Start knapp 1 GB herunter, am besten im WLAN. Danach bleibt sie auf diesem Gerät gespeichert. Wird der Download unterbrochen, geht es beim nächsten Mal dort weiter. Jetzt laden?"))
        throw Object.assign(new Error("Download abgebrochen."),{cancel:true});
      S.localOk=true;saveS();persistStore();
      try{return await loadEngine(v)}
      catch(e){ // Grafikkarte meldet 16-Bit, scheitert aber daran: ab jetzt die q4f32-Fassung (nutzt die schon geladenen Dateien)
        if(v!=="f16"||!gpuErr(e))throw e;
        S.localF32=true;saveS();
        return await loadEngine("f32");
      }
    })();
    engineP.then(()=>{lstat.hidden=true;persistStore()},()=>{engineP=null;lstat.hidden=true}); // nach einem Fehler beim nächsten Mal neu versuchen
  }
  return engineP;
}
// Vorladen im Hintergrund (nach der Auswahl in den Einstellungen oder beim Start); Fehler zeigt die Statuszeile
async function preloadLocal(){
  try{await localEngine()}
  catch(e){if(e?.cancel)return;lstat.hidden=false;lstat.classList.add("bad");$("#lstatT").textContent=localErr(e,"geladen werden");$("#lstatP").hidden=true}
}
// Liegt die Fassung v schon vollständig auf dem Gerät? Dann darf sie ohne Rückfrage vorladen. Für q4f32 reichen auch die q4f16-Dateien,
// der Service-Worker wandelt sie ohne Netz um.
async function localCached(v){
  try{
    if(!v||!await caches.has("webllm/model"))return false;
    const c=await caches.open("webllm/model"),have=new Set((await c.keys()).map(q=>q.url));
    const full=async f=>{const r=await c.match(f+"tensor-cache.json");return!!r&&(await r.json()).records.every(s=>have.has(f+s.dataPath))};
    return await full(LOCAL[v].files)||v==="f32"&&await full(LOCAL.f16.files);
  }catch{return false}
}
async function askLocal(c,um,live){
  loadEl=live;
  const eng=await localEngine();
  loadEl=null;
  live.innerHTML='<p class="tool wait">xbubekir denkt nach …</p>';
  const hist=[];let n=0; // jüngste Nachrichten zuerst, bis das Kontextfenster ungefähr voll ist
  for(const m of c.msgs.filter(m=>!m.skip).reverse()){n+=m.content.length;if(n>LOCAL.maxChars&&hist.length)break;hist.unshift({role:m.role,content:m.content})}
  if(hist[0]?.role==="assistant")hist.shift();
  let txt="",stopped=false;
  stopFn=()=>{stopped=true;eng.interruptGenerate()};
  const chunks=await eng.chat.completions.create({messages:[{role:"system",content:c.system},...hist],stream:true,temperature:0.7,max_tokens:1024,extra_body:{enable_thinking:false}});
  for await(const ch of chunks){txt+=ch.choices[0]?.delta?.content||"";paint(live,[{type:"text",text:clean(txt)}])}
  txt=clean(txt);
  if(!txt){if(stopped){undo(c,um);return}throw new Error("Die xbubekir-KI hat keine Antwort geschrieben.")}
  c.msgs.push({role:"assistant",content:txt,...(stopped?{note:"stop"}:{})});
}

// ---------- DeepSeek (Open Source) über den eigenen Server → OpenRouter ----------
// Der Server (server/openrouter) prüft das Konto, ergänzt den Schlüssel und legt Modelle, Länge und erlaubte Anbieter fest.
async function askOpen(c,um,live){
  const{data}=await(await auth()).getSession();
  if(!data.session)throw Object.assign(new Error("Nicht angemeldet."),{status:401});
  const ctl=new AbortController();let think="",txt="",fin="";
  stopFn=()=>ctl.abort();
  const blocks=()=>[...(think.trim()?[{type:"thinking",thinking:think}]:[]),...(txt?[{type:"text",text:txt}]:[])];
  const plain=m=>typeof m.content==="string"?m.content:m.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  try{
    const res=await fetch(SB_OR,{method:"POST",signal:ctl.signal,headers:{"content-type":"application/json",Authorization:"Bearer "+data.session.access_token},
      body:JSON.stringify({model:c.model,effort:S.effort,messages:[{role:"system",content:c.system},...c.msgs.filter(m=>!m.skip).map(m=>({role:m.role,content:plain(m)}))]})});
    if(!res.ok){let msg=res.statusText;try{msg=(await res.json()).error?.message||msg}catch{}throw Object.assign(new Error(msg),{status:res.status})}
    const rd=res.body.pipeThrough(new TextDecoderStream()).getReader();let buf="";
    for(;;){ // Server-Sent Events: „data: {…}“-Zeilen, Kommentare („: OPENROUTER PROCESSING“) halten nur die Verbindung offen
      const{value,done}=await rd.read();if(done)break;
      buf+=value;let i;
      while((i=buf.indexOf("\n"))>=0){
        const line=buf.slice(0,i).trim();buf=buf.slice(i+1);
        if(!line.startsWith("data:"))continue;
        const d=line.slice(5).trim();if(d==="[DONE]")continue;
        let j;try{j=JSON.parse(d)}catch{continue}
        if(j.error)throw Object.assign(new Error(j.error.message||"Fehler beim Anbieter"),{status:+j.error.code||502});
        const ch=j.choices?.[0];if(!ch)continue;
        think+=ch.delta?.reasoning||"";txt+=ch.delta?.content||"";
        if(ch.finish_reason)fin=ch.finish_reason;
        paint(live,blocks());
      }
    }
  }catch(e){if(!ctl.signal.aborted)throw e}
  if(ctl.signal.aborted){ // Stopp gedrückt: bisherigen Text behalten (ohne Gedanken)
    if(txt.trim())c.msgs.push({role:"assistant",content:[{type:"text",text:txt}],note:"stop"});
    else undo(c,um);
    return;
  }
  if(!txt.trim())throw new Error("DeepSeek hat keine Antwort geschickt"+(fin?` (${fin})`:"")+".");
  c.msgs.push({role:"assistant",content:blocks(),...(fin==="length"?{note:"cut"}:{})});
}

// ---------- Claude ----------
function claudeParams(c){
  const p={model:c.model,max_tokens:MAX_TOKENS,system:c.system,
    messages:c.msgs.filter(m=>!m.skip).map(m=>({role:m.role,content:m.content})),
    thinking:{type:"adaptive",display:"summarized"},output_config:{effort:S.effort},cache_control:{type:"ephemeral"}};
  if(c.tools.length)p.tools=c.tools;
  if(MODELS[c.model]?.fb){p.betas=["server-side-fallback-2026-07-01"];p.fallbacks="default"}
  return p;
}

// Antwortinhalt so speichern, wie die API ihn zurückbekommen soll. Ist mitten in der Antwort ein Ersatzmodell eingesprungen,
// fallen vor der Übergabestelle Denkblöcke und unvollständige Werkzeugaufrufe weg (Text und abgeschlossene Suchen bleiben).
function replay(content){
  const fb=content.findLastIndex(b=>b.type==="fallback");
  const done=new Set(content.filter(b=>b.tool_use_id).map(b=>b.tool_use_id));
  const out=content.filter((b,i)=>i>=fb||b.type==="text"||(b.type==="server_tool_use"&&done.has(b.id))||(b.tool_use_id&&b.type!=="tool_use"));
  return JSON.parse(JSON.stringify(out));
}

async function askClaude(c,um,live){
  const api=await client("claude"),A=SDK.claude,start=c.msgs.indexOf(um);
  let prev=[],rounds=0,stream=null;
  try{
    for(;;){
      stream=api.beta.messages.stream(claudeParams(c));
      stopFn=()=>stream.abort();
      for await(const _ of stream)paint(live,prev.concat(stream.currentMessage?.content||[]));
      const msg=await stream.finalMessage();
      if(msg.stop_reason==="refusal"){refuse(c,um,start);break} // auch das Ersatzmodell hat abgelehnt
      const content=replay(msg.content);
      c.msgs.push({role:"assistant",content,...(msg.stop_reason==="max_tokens"?{note:"cut"}:{})});
      if(msg.stop_reason==="pause_turn"&&++rounds<5){prev=prev.concat(content);continue} // lange Websuche: einfach weiterlaufen lassen
      break;
    }
  }catch(e){
    if(!(e instanceof A.APIUserAbortError))throw e;
    // Stopp gedrückt: bisherigen Text behalten (ohne Denkblöcke, die wären unvollständig)
    const part=(stream.currentMessage?.content||[]).filter(b=>b.type==="text"&&b.text).map(b=>({type:"text",text:b.text}));
    if(part.length)c.msgs.push({role:"assistant",content:part,note:"stop"});
    else if(c.msgs.at(-1)===um)undo(c,um);
  }
}

// Abgelehnte Runde: Teilantwort verwerfen und die Frage aus dem weiteren Verlauf nehmen (nur das Ende des Verlaufs)
function refuse(c,um,start){for(const m of c.msgs.slice(start))m.skip=true;um.note="refusal"}
// Fehlgeschlagene Runde ganz entfernen (nur das Ende des Verlaufs) und die Nachricht zurück ins Eingabefeld legen
function undo(c,um){
  const i=c.msgs.indexOf(um);if(i<0)return;
  c.msgs.splice(i);
  if(c===cur&&!inp.value.trim()){inp.value=um.content;grow();return true}
}

// Fehler in kurzen Worten. raw: Originalmeldung (hilft bei der Fehlersuche, steht eingeklappt darunter).
// act: passender Knopf (limit: Flash-Lite, key: Schlüssel prüfen, acct: neu anmelden, brain: Gehirn wählen, new: neuer Chat)
function errInfo(e,p){
  const s=e?.status,st=s?`${s}: `:"";
  if(p==="eigen")return{t:localErr(e,"antworten")};
  if(p==="open"){
    if(e instanceof TypeError&&!s)return{t:"Keine Verbindung zu deinem Server. Bist du online?"};
    const t=s===401||s===403?"Dein xbubekir-Konto hat gerade keinen Zugang. Melde dich neu an."
      :s===402?"Das OpenRouter-Guthaben ist aufgebraucht oder das Ausgabenlimit des Schlüssels erreicht. Lade auf openrouter.ai auf."
      :s===429?"Gerade zu viele Anfragen. Warte einen Moment und versuch es nochmal."
      :s===413?"Der Chat ist zu lang. Mach am besten in einem neuen Chat weiter."
      :s>=500?"Der Server oder DeepSeek hatte gerade ein Problem. Versuch es gleich nochmal."
      :"Unerwarteter Fehler.";
    return{t,raw:st+(e?.message||String(e)),act:s===401||s===403?"acct":s===413?"new":""};
  }
  if(p==="gemini"){
    let msg=e?.message||String(e);
    try{msg=JSON.parse(msg.slice(msg.indexOf("{"))).error.message||msg}catch{}
    if(e instanceof TypeError&&!s)return{t:"Keine Verbindung zu Google. Bist du online?"};
    const konto=S.gmode==="konto";
    const t=s===429?"Das Gratis-Kontingent von Gemini ist gerade aufgebraucht. Meist reicht eine Minute Pause. Ist das Tageslimit erreicht, geht es nach Mitternacht kalifornischer Zeit weiter, in Deutschland also morgens um 8 oder 9 Uhr."
      :s===401||s===403?(konto?"Dein xbubekir-Konto hat gerade keinen Zugang. Melde dich neu an.":"Google hat deinen Gemini-Schlüssel abgelehnt.")
      :s===404?"Das Modell wurde nicht gefunden. Wähl ein anderes Gehirn, dann geht es in einem neuen Chat weiter."
      :s===400?"Google hat die Anfrage abgelehnt."
      :s>=500?"Gemini ist gerade überlastet. Versuch es gleich nochmal."
      :"Unerwarteter Fehler.";
    return{t,raw:st+msg,act:s===429?"limit":s===401||s===403?(konto?"acct":"key"):s===404?"brain":""};
  }
  const A=SDK.claude,raw=st+(e?.error?.error?.message||e?.message||String(e));
  if(!A)return{t:"Unerwarteter Fehler.",raw};
  if(e instanceof A.AuthenticationError)return{t:"Anthropic hat deinen Schlüssel abgelehnt.",raw,act:"key"};
  if(s===402||/credit balance/i.test(raw))return{t:"Dein Anthropic-Guthaben ist aufgebraucht. Lade auf platform.claude.com auf oder wähl ein anderes Gehirn.",raw,act:"brain"};
  if(e instanceof A.PermissionDeniedError)return{t:"Dein Schlüssel darf dieses Modell nicht nutzen.",raw,act:"brain"};
  if(e instanceof A.NotFoundError)return{t:"Das Modell wurde nicht gefunden. Wähl ein anderes Gehirn, dann geht es in einem neuen Chat weiter.",raw,act:"brain"};
  if(e instanceof A.RateLimitError)return{t:"Gerade zu viele Anfragen. Warte einen Moment und schick die Nachricht nochmal.",raw};
  if(e instanceof A.BadRequestError)return{t:"Anthropic hat die Anfrage abgelehnt.",raw};
  if(e instanceof A.InternalServerError)return{t:"Claude ist gerade überlastet oder hatte einen Fehler. Versuch es gleich nochmal.",raw};
  if(e instanceof A.APIConnectionError)return{t:"Keine Verbindung zu Anthropic. Bist du online?"};
  if(e instanceof A.APIError)return{t:"Anthropic hat einen Fehler gemeldet.",raw};
  return{t:"Unerwarteter Fehler.",raw};
}
// back: Nachricht liegt wieder im Eingabefeld (Knopf „Nochmal senden“); again: Frage steht noch im Chat (Knopf „Nochmal versuchen“)
function showError(e,p,back,again){
  console.error(e);
  const{t,raw,act}=errInfo(e,p);
  const b=(a,txt,alt=true)=>`<button class="btn${alt?" alt":""}" type="button" data-act="${a}">${txt}</button>`;
  const acts=(back?b("retry","Nochmal senden",false):"")+(again?b("again","Nochmal versuchen",false):"")
    +(act==="limit"&&back&&cur?.model!=="gemini-3.5-flash-lite"?b("lite","Neuer Chat mit Flash-Lite"):"")
    +(act==="key"?b("set","Schlüssel prüfen"):"")+(act==="acct"?b("login","Neu anmelden"):"")
    +(act==="brain"?b("brain","Gehirn wählen"):"")+(act==="new"?b("new","Neuer Chat"):"");
  if(again)log.querySelector(".acts-a.end")?.remove(); // der Knopf in der Fehlermeldung reicht
  log.insertAdjacentHTML("beforeend",`<div class="err" role="alert"><p>${esc(t)}${back?" Deine Nachricht steht wieder im Eingabefeld.":""}</p>${acts?`<div class="eacts">${acts}</div>`:""}${raw?`<details><summary>Genaue Meldung</summary><code>${esc(raw)}</code></details>`:""}</div>`);
  toBottom();
}
async function errAct(a){
  if(busy)return;
  if(a==="retry")send();
  else if(a==="again")regen();
  else if(a==="lite"){S.provider="gemini";S.model=S.models.gemini="gemini-3.5-flash-lite";saveS();cur=null;send()}
  else if(a==="set")openSettings();
  else if(a==="login"){await(await auth()).signOut().catch(()=>{});session=null;render()}
  else if(a==="brain")openBrain();
  else if(a==="new")startNew();
}

// ---------- Darstellung ----------
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl=u=>/^https?:\/\//i.test(u||"");
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch{return""}};
const link=(u,t)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`;
// Arabisch: Läufe bekommen lang="ar" (eigene Schrift, größer für die Harakat, arabische Stimme beim Vorlesen). Die Richtung
// bleibt beim Absatz: Nur rein arabische Absätze laufen von rechts nach links, gemischte Zeilen bleiben deutsch ausgerichtet.
const AR="\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
const AR_RUN=new RegExp(`[${AR}]+(?:[ \\u00A0\\u200C]+[${AR}]+)*`,"g"),AR_ANY=new RegExp(`[${AR}]`),LATIN=/[A-Za-zÀ-ɏḀ-ỿ]/;
const ar=h=>h.replace(AR_RUN,'<span lang="ar">$&</span>');
const rtl=t=>AR_ANY.test(t)&&!LATIN.test(t.replace(/\]\([^)]*\)|https?:\/\/\S+/g,""))?' dir="rtl"':"";

// Kleiner Markdown-Leser: erst alles escapen, dann nur bekannte Auszeichnungen erzeugen
function inline(s){
  const keep=[],put=h=>`\u0000${keep.push(h)-1}\u0000`;
  s=s.replace(/`([^`\n]+)`/g,(_,c)=>put(`<code>${esc(c)}</code>`));
  s=s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,t,u)=>put(link(u,ar(esc(t)))));
  s=s.replace(/https?:\/\/[^\s<>()"\u0000]*[^\s<>()".,;:!?'*_\u0000]/g,u=>put(link(u,esc(u))));
  s=esc(s)
    .replace(/\*\*(?=\S)(.+?)\*\*/g,"<strong>$1</strong>").replace(/(^|[^_\w])__(?=\S)(.+?)__(?![_\w])/g,"$1<strong>$2</strong>")
    .replace(/(^|[^*\w])\*(?=\S)([^*]+?)\*(?![*\w])/g,"$1<em>$2</em>").replace(/(^|[^_\w])_(?=\S)([^_]+?)_(?![_\w])/g,"$1<em>$2</em>")
    .replace(/~~(?=\S)(.+?)~~/g,"<del>$1</del>");
  return ar(s).replace(/\u0000(\d+)\u0000/g,(_,i)=>keep[i]);
}
const RX={fence:/^\s*(`{3,}|~{3,})\s*([\w+#.-]*)/,head:/^(#{1,6})\s+(.*?)\s*#*\s*$/,hr:/^\s*([-*_])(\s*\1){2,}\s*$/,quote:/^\s*>/,item:/^(\s*)([-*+]|(\d+)[.)])\s+(.*)$/,row:/^\s*\|.*\|\s*$/,sep:/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/};
function isBlock(L,i){const l=L[i];return RX.fence.test(l)||RX.head.test(l)||RX.hr.test(l)||RX.quote.test(l)||RX.item.test(l)||(RX.row.test(l)&&RX.sep.test(L[i+1]||""))}
function md(src){
  const L=src.replace(/\u0000/g,"").replace(/\r\n?/g,"\n").split("\n"),out=[];
  let i=0,m;
  while(i<L.length){
    const l=L[i];
    if(!l.trim()){i++;continue}
    if(m=RX.fence.exec(l)){ // Codeblock (beim Streamen auch ohne schließende Zeile)
      const end=new RegExp("^\\s*"+m[1][0]+"{"+m[1].length+",}\\s*$"),buf=[];
      for(i++;i<L.length&&!end.test(L[i]);i++)buf.push(L[i]);
      i++;out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);continue;
    }
    if(m=RX.head.exec(l)){const n=Math.min(m[1].length+1,6);out.push(`<h${n}${rtl(m[2])}>${inline(m[2])}</h${n}>`);i++;continue} // Seite: h1, Chat ab h2
    if(RX.hr.test(l)){out.push("<hr>");i++;continue}
    if(RX.row.test(l)&&RX.sep.test(L[i+1]||"")){ // Tabelle
      const cells=r=>r.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim());
      const al=cells(L[i+1]).map(c=>/^:-+:$/.test(c)?' class="c"':/-:$/.test(c)?' class="r"':"");
      const head=cells(l);
      let body="";
      for(i+=2;i<L.length&&RX.row.test(L[i]);i++)body+=`<tr>${cells(L[i]).map((c,j)=>`<td${al[j]||""}${rtl(c)}>${inline(c)}</td>`).join("")}</tr>`;
      out.push(`<div class="tbl"><table><thead><tr>${head.map((c,j)=>`<th${al[j]||""}${rtl(c)}>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }
    if(RX.quote.test(l)){const buf=[];while(i<L.length&&RX.quote.test(L[i]))buf.push(L[i++].replace(/^\s*>\s?/,""));out.push(`<blockquote${rtl(buf.join(" "))}>${md(buf.join("\n"))}</blockquote>`);continue}
    if(RX.item.test(l)){ // Liste, Einrückung = Unterliste
      const items=[];
      while(i<L.length){
        const it=RX.item.exec(L[i]);
        if(it){items.push({ind:it[1].replace(/\t/g,"  ").length,ord:!!it[3],start:+it[3]||1,text:it[4]});i++;continue}
        if(!L[i].trim()){let j=i;while(j<L.length&&!L[j].trim())j++;if(j<L.length&&(RX.item.test(L[j])||/^\s{2,}\S/.test(L[j]))){i=j;continue}break}
        if(/^\s+\S/.test(L[i])||!isBlock(L,i)&&items.length&&L[i-1].trim()){items.at(-1).text+="\n"+L[i].trim();i++;continue}
        break;
      }
      out.push(list(items));continue;
    }
    const buf=[];
    while(i<L.length&&L[i].trim()&&!(buf.length&&isBlock(L,i)))buf.push(L[i++]);
    out.push(`<p${rtl(buf.join(" "))}>${buf.map(inline).join("<br>")}</p>`);
  }
  return out.join("");
}
function list(items){
  let h="";const st=[],dir=items.every(it=>rtl(it.text))?' dir="rtl"':""; // nur eine ganz arabische Liste läuft von rechts
  for(const it of items){
    while(st.length&&it.ind<st.at(-1).ind)h+=`</li></${st.pop().tag}>`;
    const top=st.at(-1);
    const tag=it.ord?"ol":"ul";
    if(top&&it.ind===top.ind&&tag!==top.tag)h+=`</li></${st.pop().tag}>`; // Wechsel zwischen Punkt- und Nummernliste
    if(!st.length||it.ind>st.at(-1).ind){st.push({ind:it.ind,tag});h+=`<${tag}${it.ord&&it.start!==1?` start="${it.start}"`:""}${dir}><li>`}
    else h+="</li><li>";
    h+=it.text.split("\n").map(inline).join("<br>");
  }
  while(st.length)h+=`</li></${st.pop().tag}>`;
  return h;
}
// Klartext zum Kopieren: Markdown-Zeichen weg, Listenpunkte als •, Tabellenzeilen mit Gedankenstrich, Code bleibt wie er ist
function plain(src){
  const out=[];let code=false;
  for(const l of src.replace(/\r\n?/g,"\n").split("\n")){
    if(RX.fence.test(l)){code=!code;continue}
    if(code){out.push(l);continue}
    if(RX.hr.test(l)||RX.sep.test(l)&&!RX.item.test(l))continue; // Trennlinien und Tabellenköpfe
    let t=RX.row.test(l)?l.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim()).join(" – "):l.replace(RX.head,"$2").replace(/^(\s*)[-*+]\s+/,"$1• ").replace(/^\s*>\s?/,"");
    const keep=[];t=t.replace(/`([^`\n]+)`/g,(_,c)=>`\u0000${keep.push(c)-1}\u0000`);
    t=t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,"$1 ($2)").replace(/\*\*(?=\S)(.+?)\*\*/g,"$1").replace(/(^|[^_\w])__(?=\S)(.+?)__(?![_\w])/g,"$1$2")
      .replace(/(^|[^*\w])\*(?=\S)([^*]+?)\*(?![*\w])/g,"$1$2").replace(/(^|[^_\w])_(?=\S)([^_]+?)_(?![_\w])/g,"$1$2").replace(/~~(?=\S)(.+?)~~/g,"$1");
    out.push(t.replace(/\u0000(\d+)\u0000/g,(_,i)=>keep[i]));
  }
  return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

function viewBlocks(blocks,live){
  let h="",txt="";const cites=new Map();
  const flush=()=>{if(txt.trim())h+=`<div class="md">${md(txt)}</div>`;txt=""};
  blocks.forEach((b,i)=>{
    if(b.type==="text"){txt+=b.text||"";for(const c of b.citations||[])if(safeUrl(c.url)&&!cites.has(c.url))cites.set(c.url,c.title||host(c.url))}
    else if(b.type==="thinking"){flush();if(live&&i===blocks.length-1)h+='<p class="tool wait">xbubekir denkt nach …</p>';else if(b.thinking?.trim())h+=`<details class="think"><summary>Gedankengang</summary><div class="md">${md(b.thinking)}</div></details>`}
    else if(b.type==="server_tool_use"&&b.name==="web_search"){flush();let q="";try{q=b.input?.query||""}catch{}const now=live&&i===blocks.length-1;h+=`<p class="tool${now?" wait":""}">${IC.search}<span>${now?"Sucht im Netz":"Im Netz gesucht"}${q?`: „${esc(q)}“`:now?" …":""}</span></p>`}
    else if(b.type==="web_search_tool_result"&&b.content&&!Array.isArray(b.content)){flush();h+='<p class="tool">Die Suche hat nicht geklappt.</p>'}
    else if(b.type==="fallback"){flush();h+='<p class="note">Für diese Antwort ist ein anderes Claude-Modell eingesprungen.</p>'}
  });
  flush();
  if(live&&!h)h='<p class="tool wait">xbubekir denkt nach …</p>';
  if(cites.size)h+=`<div class="src"><b>Quellen</b><ol>${[...cites].map(([u,t])=>`<li>${link(u,esc(t))} <span>${esc(host(u))}</span></li>`).join("")}</ol></div>`;
  return h;
}

function chatHTML(c){
  let h="";const M=c.msgs,p=provOf(c);copies=[];
  const toBlocks=m=>p==="gemini"?geminiBlocks(m.content):p==="eigen"?[{type:"text",text:m.content}]:m.content;
  for(let i=0;i<M.length;){
    const m=M[i];
    if(m.role==="user"){h+=`<div class="msg u"><div class="bub" dir="auto">${ar(esc(m.content))}</div></div>`;if(m.note)h+=`<p class="note">${NOTES[m.note]}</p>`;i++;continue}
    const blocks=[];let note="";
    for(;i<M.length&&M[i].role==="assistant";i++)if(!M[i].skip){blocks.push(...toBlocks(M[i]));if(M[i].note)note=M[i].note} // Fortsetzungen (pause_turn) zusammen zeigen
    if(!blocks.length)continue;
    const n=copies.push(blocks.filter(b=>b.type==="text").map(b=>b.text).join("").trim())-1,last=i===M.length&&!busy; // nur die letzte Antwort lässt sich neu erzeugen
    h+=`<div class="msg a">${viewBlocks(blocks,false)}${note?`<p class="note">${NOTES[note]}</p>`:""}<div class="acts-a"><button class="mini" type="button" data-copy="${n}">${IC.copy}<span>Kopieren</span></button>${last?`<button class="mini" type="button" data-again>${IC.again}<span>Nochmal</span></button>`:""}${last&&note==="cut"?`<button class="mini" type="button" data-more>${IC.on}<span>Weiter</span></button>`:""}</div></div>`;
  }
  const end=M.at(-1); // Frage ohne Antwort (Neu-Erzeugen ist schiefgegangen): Antwort nochmal anfordern
  if(end?.role==="user"&&!end.skip&&!busy)h+=`<div class="acts-a end"><button class="mini" type="button" data-again>${IC.again}<span>Antwort anfordern</span></button></div>`;
  return h;
}

const itemHTML=(c,del)=>{const t=esc(c.title||"Ohne Titel"),on=del&&c===cur;
  return`<li${on?' class="on"':""}><button class="open" type="button" data-id="${esc(c.id)}"${on?' aria-current="page"':""}><b>${t}</b><small>${when(c.updated)} · ${esc(MODELS[c.model]?.name||c.model)}</small></button>${del?`<button class="ib del" type="button" data-del="${esc(c.id)}" aria-label="Chat „${t}“ löschen" title="Löschen">${IC.del}</button>`:""}</li>`};
function helloHTML(){ // für genau eine Person: Begrüßung mit Namen, am Handy darunter die letzten Chats
  const n=S.name.trim(),hr=new Date().getHours(),hi=hr>=5&&hr<11?"Guten Morgen":hr>=18&&hr<23?"Guten Abend":"Hallo",rec=chats.slice(0,3);
  return`<div class="hello"><img class="mark" src="brand/xbu.webp" alt="xbu" width="640" height="376"><h2 class="hi">${hi}${n?", "+esc(n):""}!</h2><p class="tag">Frag. Entdecke. Erreiche mehr.</p></div>`
    +(rec.length?`<section class="recent" aria-labelledby="rcH"><h3 id="rcH">Weiter, wo du warst</h3><ul>${rec.map(c=>itemHTML(c,false)).join("")}</ul>${chats.length>rec.length?'<button class="linkbtn" type="button" data-all>Alle Chats</button>':""}</section>`:"");
}
function loginHTML(){
  return`<form class="setup" id="suForm" novalidate aria-labelledby="suH"><img src="icons/icon-192.png" alt=""><h2 id="suH">Willkommen bei xbubekir</h2>
<p>Melde dich mit deinem xbubekir-Konto an. Der ${S.provider==="open"?"OpenRouter":"Gemini"}-Schlüssel liegt sicher auf deinem eigenen Server, du musst ihn nirgends eingeben.</p>
<label for="suMail">E-Mail</label><input class="f" id="suMail" type="email" autocomplete="username" autocapitalize="off" spellcheck="false">
<label for="suPw">Passwort</label><input class="f" id="suPw" type="password" autocomplete="current-password">
<button class="btn wide" type="submit" id="suIn">Anmelden</button>
<p class="status" id="suMsg" role="status"></p>
<details class="alts"><summary>Andere Wege</summary><div>
<button class="linkbtn" type="button" id="suNew">Neues Konto erstellen</button>
<p class="hint">Der Zugang ist nur für dich: Ein neues Konto funktioniert erst, wenn es auf dem Server freigeschaltet ist.</p>
<button class="linkbtn" type="button" id="suKeyMode">${S.provider==="open"?"Gemini mit eigenem Schlüssel nutzen":"Eigenen Gemini-Schlüssel eingeben"}</button>
<button class="linkbtn" type="button" id="suLocal">Eigene xbubekir-KI im Browser, ganz ohne Konto</button>
<button class="linkbtn" type="button" id="suSwitch">Claude von Anthropic nutzen (kostenpflichtig)</button>
</div></details></form>`;
}
async function login(neu){
  const mail=$("#suMail").value.trim(),pw=$("#suPw").value,msg=$("#suMsg");
  msg.className="status";
  if(!mail||pw.length<8){msg.textContent="Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen eingeben.";msg.classList.add("bad");return}
  msg.textContent=neu?"Lege dein Konto an …":"Melde dich an …";
  const a=await auth();
  const{data,error}=neu?await a.signUp({email:mail,password:pw,options:{emailRedirectTo:location.origin+location.pathname}}):await a.signInWithPassword({email:mail,password:pw});
  if(error){msg.textContent=(neu?"Konto konnte nicht angelegt werden: ":"Anmeldung hat nicht geklappt: ")+error.message;msg.classList.add("bad");return}
  if(!data.session){msg.textContent="Fast geschafft: Du bekommst gleich eine E-Mail. Tipp auf den Link darin und melde dich danach hier an.";return}
  session=data.session;render();inp.focus();
}
function setupHTML(){
  const gem=S.provider==="gemini";
  const steps=gem
    ?`<p>xbubekir ist deine persönliche KI. Das Denken übernimmt Gemini von Google, kostenlos. Dafür brauchst du einmalig einen eigenen API-Schlüssel:</p>
<ol><li>${link("https://aistudio.google.com/apikey","aistudio.google.com/apikey")} öffnen und mit deinem Google-Konto anmelden.</li>
<li>„API-Schlüssel erstellen“ („Create API key“) antippen.</li>
<li>Den Schlüssel kopieren und hier einfügen.</li></ol>`
    :`<p>xbubekir ist deine persönliche KI. Das Denken übernimmt Claude von Anthropic. Dafür brauchst du einmalig einen eigenen API-Schlüssel:</p>
<ol><li>Auf ${link("https://platform.claude.com/","platform.claude.com")} anmelden und unter „Billing“ etwas Guthaben aufladen.</li>
<li>Unter „API Keys“ einen neuen Schlüssel erstellen.</li>
<li>Den Schlüssel (beginnt mit <code>sk-ant-</code>) hier einfügen.</li></ol>`;
  const hint=gem
    ?"Kostenlos, solange du bei Google keine Zahlungsmethode hinterlegst. Dafür begrenzt Google, wie viele Nachrichten du pro Minute und pro Tag schicken kannst. In der Gratis-Stufe darf Google deine Nachrichten lesen und zur Verbesserung seiner Produkte nutzen, außer du wohnst in der EU, der Schweiz oder Großbritannien. Der Schlüssel bleibt nur auf diesem Gerät."
    :"Der Schlüssel bleibt nur auf diesem Gerät und wird nur an api.anthropic.com geschickt. Abgerechnet wird nach Nutzung über dein Anthropic-Konto. Setz dir dort am besten ein monatliches Limit.";
  return`<form class="setup" id="suForm" novalidate aria-labelledby="suH"><img src="icons/icon-192.png" alt=""><h2 id="suH">Willkommen bei xbubekir</h2>
${steps}
<label for="suKey">${gem?"Gemini-API-Schlüssel":"Anthropic-API-Schlüssel"}</label>
<div class="keyrow"><input class="f" id="suKey" type="password" autocomplete="off" spellcheck="false" placeholder="${gem?"Schlüssel einfügen":"sk-ant-…"}"><button class="btn" type="submit" id="suGo">Los geht’s</button></div>
<p class="hint">${hint}</p>
<p class="status" id="suMsg" role="status"></p>
<details class="alts"><summary>Andere Wege</summary><div>
<button class="linkbtn" type="button" id="suSwitch">${gem?"Lieber Claude von Anthropic nutzen (kostenpflichtig)":"Lieber Gemini von Google nutzen (kostenlos)"}</button>
<button class="linkbtn" type="button" id="suLocal">Eigene xbubekir-KI im Browser, ganz ohne Schlüssel</button>
</div></details></form>`;
}

// Gehirn-Zeile an der Eingabe: ein laufender Chat behält sein Gehirn; Denktiefe und Websuche stehen mit dabei
function updBrain(){
  const nm=m=>MODELS[m]?.name||m,b=cur?.model||S.model,eff=MODELS[b]?.p==="eigen"?"":{medium:"Normal",high:"Gründlich"}[S.effort]||"";
  const web=cur?cur.tools?.length>0:S.web&&!!MODELS[S.model]?.web;
  const t=nm(b)+(eff?` · ${eff}`:"")+(b!==S.model?` · neue Chats: ${nm(S.model)}`:"");
  bBrain.innerHTML=`<i class="dot"></i><span class="bt">${esc(t)}</span>${web?`<span class="gl" title="Mit Websuche">${IC.globe}</span>`:""}${IC.chev}`;
  bBrain.setAttribute("aria-label",`Gehirn: ${t}${web?", mit Websuche":""}. Wechseln`);
}
function render(){
  const ready=!!keyOf(S.provider),has=!!(ready&&cur&&cur.msgs.length),st=log.scrollTop,stick=nearBottom();
  document.body.classList.toggle("nokey",!ready);
  document.body.classList.toggle("start",ready&&!has);
  updBrain();renderList();
  $("#topT").textContent=has?cur.title||"Ohne Titel":"";$("#topWm").hidden=has;
  if(!ready){
    log.innerHTML=viaKonto(S.provider)?loginHTML():setupHTML();
    const to=p=>{S.provider=p;S.model=modelFor(p);saveS();cur=null;render()};
    $("#suLocal").onclick=()=>{to("eigen");preloadLocal()};
    if(viaKonto(S.provider)){
      $("#suForm").onsubmit=e=>{e.preventDefault();login(false)};
      $("#suNew").onclick=()=>login(true);
      $("#suKeyMode").onclick=()=>{S.gmode="key";if(S.provider==="open")to("gemini");else{saveS();render()}};
      $("#suSwitch").onclick=()=>to("claude");
    }else{
      $("#suForm").onsubmit=e=>{e.preventDefault();checkKey(S.provider,$("#suKey").value,$("#suMsg"),$("#suGo")).then(ok=>{if(ok){saveS();render();inp.focus()}})};
      $("#suSwitch").onclick=()=>{S.gmode="konto";to(S.provider==="gemini"?"claude":"gemini")};
    }
    return;
  }
  log.innerHTML=has?chatHTML(cur):helloHTML();
  if(!has)log.scrollTop=0;else{log.scrollTop=st;if(stick)toBottom()}
  updSend();updDown();
}

let raf=0,pending=null;
function paint(el,blocks){ // beim Streamen höchstens einmal pro Bild neu zeichnen
  pending=blocks;
  if(raf)return;
  raf=requestAnimationFrame(()=>{raf=0;if(!el.isConnected)return;const stick=nearBottom();el.innerHTML=viewBlocks(pending,true);if(stick)toBottom();updDown()});
}
const nearBottom=()=>log.scrollHeight-log.scrollTop-log.clientHeight<90;
function toBottom(){log.scrollTop=log.scrollHeight}
function updDown(){bDown.hidden=document.body.classList.contains("start")||nearBottom()}

let idle=[]; // warten darauf, dass eine angehaltene Antwort fertig aufgeräumt ist
function setBusy(b){
  busy=b;bSend.innerHTML=b?IC.stop:IC.send;bSend.classList.toggle("stop",b);bSend.setAttribute("aria-label",b?"Antwort anhalten":"Senden");bSend.title=b?"Anhalten":"Senden";updSend();
  if(!b)idle.splice(0).forEach(r=>r());
}
function updSend(){bSend.disabled=!busy&&!inp.value.trim()}
function grow(){ // Feld wächst mit, der Entwurf bleibt gespeichert, falls die App zwischendurch zugeht
  inp.style.height="auto";inp.style.height=Math.min(inp.scrollHeight+2,innerHeight*.4)+"px";updSend();
  try{if(inp.value.trim())localStorage.setItem(DK,inp.value);else localStorage.removeItem(DK)}catch{}
}
let toastT=0;
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true},3200)}
function say(t){const el=$("#say");el.textContent="";setTimeout(()=>{el.textContent=t},60)} // für Screenreader, das Gespräch selbst wird nicht vorgelesen

// ---------- Chats verwalten ----------
function store(c){c.updated=Date.now();chats.sort((a,b)=>b.updated-a.updated);DB.put(c)}
function forget(c){chats=chats.filter(x=>x!==c);DB.del(c.id)}
async function settle(){ // läuft gerade eine Antwort, wird sie vor dem Wechsel angehalten (der Teiltext bleibt im Chat)
  if(!busy)return true;
  if(!stopFn){toast("Die xbubekir-KI lädt noch. Einen Moment.");return false}
  stopFn();await new Promise(r=>idle.push(r));return true;
}
async function openChat(c){
  if(!c)return;
  if(c===cur){dChats.open&&dChats.close();return}
  if(!await settle())return;
  cur=c;dChats.open&&dChats.close();log.scrollTop=0;render();toBottom();updDown();
  if(desk.matches)inp.focus();
}
async function startNew(){if(!await settle())return;cur=null;dChats.open&&dChats.close();render();inp.focus()}
async function delChat(id){
  const c=chats.find(x=>x.id===id);if(!c)return;
  if(busy&&c===cur){toast("Halte zuerst die Antwort an.");return}
  if(!confirm(`Chat „${c.title||"Ohne Titel"}“ löschen?`))return;
  forget(c);if(c===cur)cur=null;
  if(busy)renderList();else render();
}
function openList(){renderList();dChats.showModal()}
function when(t){
  const d=new Date(t),now=new Date();
  if(d.toDateString()===now.toDateString())return d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  return d.toLocaleDateString("de-DE",{day:"numeric",month:"short",...(d.getFullYear()!==now.getFullYear()?{year:"numeric"}:{})});
}
function groupOf(t){
  const n=new Date(),d0=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime(),D=864e5;
  return t>=d0?"Heute":t>=d0-D?"Gestern":t>=d0-6*D?"Letzte 7 Tage":t>=d0-29*D?"Letzte 30 Tage":new Date(t).toLocaleDateString("de-DE",{month:"long",year:"numeric"});
}
const textOf=m=>typeof m.content==="string"?m.content:Array.isArray(m.content)?m.content.filter(b=>b.text&&!b.thought&&(!b.type||b.type==="text")).map(b=>b.text).join(" "):"";
function listHTML(q){ // Chats nach Datum gruppiert; die Suche findet Titel und Nachrichten
  q=q.trim().toLowerCase();
  const L=q?chats.filter(c=>(c.title||"").toLowerCase().includes(q)||c.msgs.some(m=>textOf(m).toLowerCase().includes(q))):chats;
  if(!L.length)return`<p class="empty">${q?"Nichts gefunden.":"Noch keine Chats."}</p>`;
  let h="",g="";
  for(const c of L){const gg=groupOf(c.updated);if(gg!==g){h+=`${g?"</ul>":""}<h3>${gg}</h3><ul>`;g=gg}h+=itemHTML(c,true)}
  return h+"</ul>";
}
function renderList(){$("#sideList").innerHTML=listHTML($("#qSide").value);$("#chList").innerHTML=listHTML($("#qChats").value)}
function copyMsg(b){ // als Klartext (ohne Markdown-Zeichen) und als formatierter Text, je nachdem, wo eingefügt wird
  const cb=navigator.clipboard;if(!cb)return;
  const txt=plain(copies[b.dataset.copy]||""),html=[...b.closest(".msg").querySelectorAll(":scope>.md")].map(e=>e.innerHTML).join("");
  const done=()=>{const s=b.querySelector("span");s.textContent="Kopiert";setTimeout(()=>{s.textContent="Kopieren"},1500)},only=()=>cb.writeText(txt).then(done,()=>{});
  if(window.ClipboardItem&&cb.write)cb.write([new ClipboardItem({"text/plain":new Blob([txt],{type:"text/plain"}),"text/html":new Blob([html],{type:"text/html"})})]).then(done,only);
  else only();
}

// ---------- Gehirn wählen (Tipp auf die Gehirn-Zeile) ----------
const PTAG={gemini:["Google Gemini","kostenlos"],claude:["Anthropic Claude","kostenpflichtig"],open:["DeepSeek","Open Source, Cent-Beträge"],eigen:["Eigene xbubekir-KI","auf diesem Gerät, kostenlos"]};
function renderBrain(){
  const nm=m=>MODELS[m]?.name||m,now=cur?.model||S.model,run=!!cur?.msgs.length;
  $("#brNote").hidden=!run;
  $("#brNote").textContent=busy?"Gerade läuft eine Antwort. Ein anderes Gehirn gilt ab dem nächsten neuen Chat.":`Dieser Chat bleibt bei ${nm(now)}. Ein anderes Gehirn beginnt einen neuen Chat.`;
  let h="";
  for(const p of["gemini","claude","open","eigen"]){
    const nogpu=p==="eigen"&&!navigator.gpu,need=nogpu?"geht auf diesem Gerät nicht":keyOf(p)?"":viaKonto(p)?"Anmeldung nötig":"Schlüssel nötig";
    h+=`<section class="bp"><h3>${PTAG[p][0]}<span>${PTAG[p][1]}</span>${need?`<em>${need}</em>`:""}</h3>`;
    for(const[id,M]of Object.entries(MODELS))if(M.p===p)h+=`<button class="bm" type="button" data-model="${id}"${id===now?' aria-current="true"':""}${nogpu?" disabled":""}><span class="mx"><b>${M.name}</b><small>${M.hint}${id===S.model&&id!==now?" · für neue Chats gewählt":""}</small></span><span class="ck">${IC.ok}</span></button>`;
    h+="</section>";
  }
  $("#brList").innerHTML=h;
  $("#brEff").hidden=MODELS[now]?.p==="eigen"; // die Browser-KI denkt nicht in Stufen
  for(const b of document.querySelectorAll("#brEff [data-eff]"))b.setAttribute("aria-pressed",String(b.dataset.eff===S.effort));
}
function openBrain(){renderBrain();dBrain.showModal()}
function pickBrain(id){ // wählt ohne Speichern-Knopf; der laufende Chat behält sein Gehirn, das neue denkt in einem neuen Chat
  const M=MODELS[id];if(!M)return;
  dBrain.close();
  S.provider=M.p;S.model=S.models[M.p]=id;saveS();
  if(busy){updBrain();return}
  if(cur?.msgs.length&&cur.model!==id)cur=null;
  render();
  if(keyOf(M.p)){if(desk.matches)inp.focus();if(M.p==="eigen")preloadLocal()}
}

// ---------- Einstellungen ----------
let webWant=true,snap=""; // webWant: Wunsch für die Websuche, auch wenn das gerade gewählte Modell keine kann
const setState=()=>["sName","sAbout","sStyle","sProv","sGMode","sModel","sEffort","sGKey","sCKey"].map(id=>$("#"+id).value).join("\u0001")+webWant;
const leaveSet=()=>setState()===snap||confirm("Änderungen verwerfen?");
function fillModels(){ // Modellauswahl passend zum gewählten Anbieter
  const p=$("#sProv").value,sel=$("#sModel"),was=sel.value||S.model; // beim ersten Öffnen ist die Auswahl noch leer
  sel.innerHTML=Object.entries(MODELS).filter(([,M])=>M.p===p).map(([id,M])=>`<option value="${id}">${M.name.replace(/^(Claude|Gemini) /,"")} – ${M.hint}</option>`).join("");
  sel.value=MODELS[was]?.p===p?was:modelFor(p);
  $("#kGemini").hidden=p!=="gemini";$("#kClaude").hidden=p!=="claude";$("#kEigen").hidden=p!=="eigen";$("#kOpen").hidden=p!=="open";
  $("#mRow").hidden=$("#eRow").hidden=p==="eigen"; // nur ein Modell, und Denkstufen gibt es dort nicht
  const konto=$("#sGMode").value==="konto";
  $("#kKonto").hidden=!(p==="open"||p==="gemini"&&konto);$("#kGKey").hidden=konto;$("#kKey").hidden=!(p==="claude"||p==="gemini"&&!konto);
  $("#kontoInfo").textContent=session?`Angemeldet als ${session.user.email}.`:"Nicht angemeldet. Nach dem Speichern erscheint die Anmeldung.";
  $("#bLogout").hidden=!session;
  costHint();
}
function costHint(){
  const M=MODELS[$("#sModel").value],w=$("#sWeb");
  w.disabled=!M.web;w.checked=!!M.web&&webWant; // ohne Websuche beim Modell auch kein Haken
  $("#costHint").textContent=M.p==="open"
    ?`${M.name}: Open-Source-KI von DeepSeek, über deinen eigenen Server bei OpenRouter. Eine normale Nachricht kostet meist weniger als 0,1 Cent${M.hint.includes("teurer")?" (dieses Modell etwa das Dreifache)":""}, bezahlt aus deinem OpenRouter-Guthaben. Es werden nur Anbieter genutzt, die nichts speichern und nicht in China sitzen. Eine Websuche gibt es hier nicht.`
    :M.p==="eigen"
    ?"Kostenlos und ohne Konto: Die eigene xbubekir-KI läuft komplett auf diesem Gerät, nichts wird an einen Server geschickt. Beim ersten Start etwa 1 GB Download. Sie ist kleiner als Gemini und irrt sich öfter, eine Websuche gibt es nicht."
    :M.p==="gemini"
    ?"Kostenlos. Google begrenzt dafür die Nachrichten pro Minute und pro Tag; die genauen Grenzen zeigt AI Studio. Das Tageslimit setzt sich um Mitternacht kalifornischer Zeit zurück. Flash-Lite erlaubt mehr Nachrichten. Eine Websuche gibt es mit Gemini hier nicht."
    :`${M.name} kostet ${M.price} pro Million Tokens, also Wortteile (Eingabe / Ausgabe). Eine normale Nachricht kostet damit meist ein paar Cent oder weniger, jede Websuche etwa einen Cent extra.${M.web?"":" Mit diesem Modell gibt es keine Websuche."}`;
}
function openSettings(){
  for(const[id,v]of[["sGKey",S.gkey],["sCKey",S.ckey]]){const k=$("#"+id);k.value=v;k.type="password"}
  document.querySelectorAll(".eye").forEach(b=>{b.textContent="Zeigen";b.setAttribute("aria-pressed","false")});
  $("#sName").value=S.name;$("#sAbout").value=S.about;$("#sStyle").value=S.style;webWant=S.web;
  $("#sProv").value=S.provider;$("#sGMode").value=S.gmode;$("#sModel").value=S.model;fillModels();
  $("#sEffort").value=S.effort;
  $("#setMsg").textContent="";$("#setMsg").className="status";
  snap=setState();
  dSet.showModal();
}
async function checkKey(p,key,msgEl,btn){ // Schlüssel einmal kostenlos prüfen (Modellabfrage), bevor er gespeichert wird
  key=key.trim();
  msgEl.className="status";
  if(!key){msgEl.textContent="Bitte füg deinen Schlüssel ein.";msgEl.classList.add("bad");return false}
  btn.disabled=true;msgEl.textContent="Prüfe den Schlüssel …";
  const keep=()=>{if(p==="gemini")S.gkey=key;else S.ckey=key;saveS()};
  try{
    const lib=await sdk(p);
    if(p==="gemini")await new lib.GoogleGenAI({apiKey:key}).models.get({model:PROV.gemini.def});
    else await new lib({apiKey:key,dangerouslyAllowBrowser:true}).models.retrieve(PROV.claude.def);
    keep();msgEl.textContent="Schlüssel funktioniert.";return true;
  }catch(e){
    const bad=p==="gemini"?[400,401,403].includes(e?.status):e instanceof SDK.claude?.AuthenticationError||e instanceof SDK.claude?.PermissionDeniedError;
    if(bad){msgEl.textContent=p==="gemini"?"Google hat den Schlüssel abgelehnt. Prüf, ob du ihn vollständig kopiert hast.":errInfo(e,p).t;msgEl.classList.add("bad");return false}
    keep();msgEl.textContent="Konnte den Schlüssel gerade nicht prüfen, er ist trotzdem gespeichert.";return true;
  }finally{btn.disabled=false}
}

$("#fSet").addEventListener("submit",async e=>{
  e.preventDefault();
  S.name=$("#sName").value;S.about=$("#sAbout").value;S.style=$("#sStyle").value;
  if($("#sProv").value!==S.provider&&!busy)cur=null; // anderer Anbieter: gleich mit einem neuen Chat weitermachen
  S.provider=$("#sProv").value;S.gmode=$("#sGMode").value;S.model=S.models[S.provider]=$("#sModel").value;S.effort=$("#sEffort").value;S.web=webWant;saveS();
  for(const[p,id]of[["gemini","sGKey"],["claude","sCKey"]]){
    const key=$("#"+id).value.trim();
    if(key===(p==="gemini"?S.gkey:S.ckey))continue;
    if(!key){if(p==="gemini")S.gkey="";else S.ckey="";saveS();continue}
    if(!await checkKey(p,key,$("#setMsg"),$("#bSave")))return;
  }
  dSet.close();
  if(busy)updBrain();else render();
  if(cur?.msgs.length&&cur.model!==S.model)toast(`Gespeichert. Dieser Chat bleibt bei ${MODELS[cur.model]?.name||cur.model}, neue Chats nutzen ${MODELS[S.model].name}.`);
  if(S.provider==="eigen")preloadLocal(); // gleich im Hintergrund laden, dann ist sie beim Tippen schon bereit
});
$("#sProv").addEventListener("change",fillModels);
$("#sGMode").addEventListener("change",fillModels);
$("#sModel").addEventListener("change",costHint);
$("#sWeb").addEventListener("change",e=>{webWant=e.target.checked});
$("#bLogout").addEventListener("click",async()=>{if(busy)return;await(await auth()).signOut();session=null;dSet.close();render()});
document.querySelectorAll(".eye").forEach(b=>b.addEventListener("click",()=>{const k=$("#"+b.dataset.for),show=k.type==="password";k.type=show?"text":"password";b.textContent=show?"Verbergen":"Zeigen";b.setAttribute("aria-pressed",String(show))}));
$("#bWipeChats").addEventListener("click",()=>{if(busy||!confirm("Wirklich alle Chats auf diesem Gerät löschen?"))return;chats=[];cur=null;DB.clear();dSet.close();render()});
$("#bWipeKey").addEventListener("click",()=>{if(busy||!confirm("Alle API-Schlüssel von diesem Gerät entfernen?"))return;S.gkey="";S.ckey="";saveS();dSet.close();render()});

// ---------- Bedienung ----------
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>{const d=b.closest("dialog");if(d===dSet&&!leaveSet())return;d.close()}));
for(const d of[dChats,dBrain])d.addEventListener("click",e=>{if(e.target===d)d.close()}); // Klick neben das Fenster schließt (Einstellungen nicht, sonst geht Getipptes verloren)
dSet.addEventListener("cancel",e=>{if(!leaveSet())e.preventDefault()});
dChats.addEventListener("close",()=>{if($("#qChats").value){$("#qChats").value="";renderList()}});
for(const id of["#bSet","#bSet2"])$(id).addEventListener("click",()=>{dChats.open&&dChats.close();openSettings()});
for(const id of["#bNew","#bNew2","#bNewTop"])$(id).addEventListener("click",startNew);
for(const id of["#qSide","#qChats"])$(id).addEventListener("input",renderList);
for(const id of["#sideList","#chList"])$(id).addEventListener("click",e=>{
  const o=e.target.closest("[data-id]"),d=e.target.closest("[data-del]");
  if(d)delChat(d.dataset.del);else if(o)openChat(chats.find(c=>c.id===o.dataset.id));
});
$("#bMenu").addEventListener("click",openList);
bBrain.addEventListener("click",openBrain);
$("#brList").addEventListener("click",e=>{const b=e.target.closest("[data-model]");if(b)pickBrain(b.dataset.model)});
$("#brEff").addEventListener("click",e=>{const b=e.target.closest("[data-eff]");if(!b)return;S.effort=b.dataset.eff;saveS();renderBrain();updBrain()});
$("#brMore").addEventListener("click",()=>{dBrain.close();openSettings()});
log.addEventListener("click",e=>{
  const t=e.target.closest("[data-copy],[data-again],[data-more],[data-act],[data-id],[data-all]");if(!t)return;
  if(t.dataset.copy!==undefined)copyMsg(t);
  else if(t.hasAttribute("data-again"))regen();
  else if(t.hasAttribute("data-more"))send("Mach bitte weiter.");
  else if(t.dataset.act)errAct(t.dataset.act);
  else if(t.dataset.id)openChat(chats.find(c=>c.id===t.dataset.id));
  else openList();
});
let atEnd=true; // stand das Gespräch unten, bleibt es unten, wenn die Tastatur aufgeht oder das Fenster kleiner wird
log.addEventListener("scroll",()=>{atEnd=nearBottom();updDown()},{passive:true});
addEventListener("resize",()=>{if(atEnd)toBottom();updDown()});
bDown.addEventListener("click",()=>log.scrollTo({top:log.scrollHeight,behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"}));
$("#composer").addEventListener("submit",e=>{e.preventDefault();if(busy)stopFn?.();else send()});
inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&desk.matches){e.preventDefault();send()}});
inp.addEventListener("input",grow);
const keyHint=()=>inp.setAttribute("enterkeyhint",desk.matches?"send":"enter"); // am Handy macht Enter eine neue Zeile, also zeigt die Tastatur keinen Senden-Knopf
desk.addEventListener("change",keyHint);
narrow.addEventListener("change",()=>{if(!narrow.matches&&dChats.open)dChats.close()});
// Am Handy: vom linken Rand nach rechts wischen öffnet die Chats, in der Schublade nach links wischen schließt sie
let tx=0,ty=0,edge=false;
document.addEventListener("touchstart",e=>{const t=e.touches[0];tx=t.clientX;ty=t.clientY;edge=narrow.matches&&tx<24&&!document.querySelector("dialog[open]")},{passive:true});
document.addEventListener("touchmove",e=>{if(!edge)return;const t=e.touches[0];if(t.clientX-tx>50&&Math.abs(t.clientY-ty)<40){edge=false;openList()}},{passive:true});
dChats.addEventListener("touchend",e=>{const t=e.changedTouches[0];if(tx-t.clientX>70&&Math.abs(t.clientY-ty)<50)dChats.close()},{passive:true});

setBusy(false);keyHint();
try{const d=localStorage.getItem(DK);if(d)inp.value=d}catch{}
if(viaKonto(S.provider)||S.gmode==="konto"||location.hash.includes("access_token")){try{session=(await(await auth()).getSession()).data.session}catch{}} // auch Rückkehr aus der Bestätigungs-Mail
try{chats=(await DB.all()).sort((a,b)=>b.updated-a.updated)}catch{chats=[]}
render();grow();
if(keyOf(S.provider)&&desk.matches)inp.focus();
if(S.provider==="eigen"&&await localCached(await localVariant()))preloadLocal(); // schon gespeichert: in den Grafikspeicher laden, während man tippt
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
