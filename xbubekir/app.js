// xbubekir: persönliche KI im Browser. Denkt mit Gemini von Google (kostenlos), Claude von Anthropic (eigener Schlüssel)
// oder mit der eigenen xbubekir-KI, die komplett auf dem Gerät läuft (WebLLM); Chats bleiben auf diesem Gerät.

// p: Anbieter; web: Websuch-Werkzeug (nur Claude); fb: serverseitiger Ersatz bei Ablehnung durch Sicherheitsfilter
const MODELS={
  "gemini-3.8-flash":{p:"gemini",name:"Gemini 3.8 Flash",hint:"am klügsten"},
  "gemini-3.5-flash-lite":{p:"gemini",name:"Gemini 3.5 Flash-Lite",hint:"am schnellsten, mehr Nachrichten pro Tag"},
  "claude-opus-5-5":{p:"claude",name:"Claude Opus 5.5",hint:"am klügsten",price:"4 $ / 20 $",web:"web_search_20260209",fb:true},
  "claude-sonnet-5-5":{p:"claude",name:"Claude Sonnet 5.5",hint:"schneller, günstiger",price:"2 $ / 10 $",web:"web_search_20260209",fb:true},
  "claude-haiku-5-5":{p:"claude",name:"Claude Haiku 5.5",hint:"am günstigsten",price:"0,10 $ / 0,50 $",web:null,fb:false},
  "xbubekir-qwen3-1.7b":{p:"eigen",name:"xbubekir-KI",hint:"Qwen3 1,7B, nachtrainiert"},
};
const PROV={gemini:{name:"Gemini",by:"Google",def:"gemini-3.8-flash"},claude:{name:"Claude",by:"Anthropic",def:"claude-opus-5-5"},eigen:{name:"xbubekir-KI",by:"xbubekir",def:"xbubekir-qwen3-1.7b"}};
// Eigene KI: nachtrainiertes Qwen3-1.7B (xbubekir/training), läuft per WebLLM im Browser. Die Browser-Bibliothek (wasm) ist die fertige
// von WebLLM für Qwen3-1.7B, weil sich beim Nachtrainieren nur die Gewichte ändern. System-Prompt wie im Training (persona.json).
const LOCAL={model:"https://huggingface.co/xbubekir/xbubekir-qwen3-1.7b-q4f16_1-MLC",id:"xbubekir-qwen3-1.7b-q4f16_1-MLC",base:"Qwen3-1.7B-q4f16_1-MLC",
  system:"Du bist xbubekir, eine persönliche KI, die direkt im Browser läuft. Du duzt, antwortest in der Sprache der Person, direkt, ehrlich und freundlich, ohne Floskeln. Kurze Fragen bekommen kurze Antworten. Wenn du etwas nicht weißt, sagst du das.",
  maxChars:6000}; // Verlauf grob kürzen, damit er ins Kontextfenster (4096 Tokens) passt
// Eigener Server (Supabase-Projekt „xbubekir“, getrennt von Mufradaat): hält den Gemini-Schlüssel, nur der Besitzer hat Zugang
const SB_URL="https://ydasoikczdjjdtdarrpx.supabase.co",SB_KEY="sb_publishable_hsk2OROaXkk_cJAR0sxkhA_2EdjhIiN",SB_FN=SB_URL+"/functions/v1/gemini";
const MAX_TOKENS=64000,LEVEL={low:"LOW",medium:"MEDIUM",high:"HIGH"};
const G_REFUSE=new Set(["SAFETY","RECITATION","BLOCKLIST","PROHIBITED_CONTENT","SPII","LANGUAGE"]);
const NOTES={
  stop:"Angehalten.",
  cut:"Die Antwort wurde abgeschnitten, weil sie zu lang wurde.",
  refusal:"Darauf kann xbubekir nicht antworten. Diese Nachricht zählt im weiteren Gespräch nicht mit.",
};
const IC={
  send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  stop:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/></svg>',
  del:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
};

const $=s=>document.querySelector(s);
const log=$("#log"),inp=$("#inp"),bSend=$("#bSend"),dSet=$("#dSet"),dChats=$("#dChats");

// ---------- Einstellungen (klein, daher localStorage) ----------
const SK="xb.settings";
const S={provider:"gemini",gmode:"konto",gkey:"",ckey:"",name:"",about:"",style:"",model:PROV.gemini.def,effort:"low",web:true};
try{Object.assign(S,JSON.parse(localStorage.getItem(SK)||"{}"))}catch{}
if(!PROV[S.provider])S.provider="gemini";
if(MODELS[S.model]?.p!==S.provider)S.model=PROV[S.provider].def;
function saveS(){try{localStorage.setItem(SK,JSON.stringify(S))}catch{}}
// Gemini entweder über das eigene Konto (Server hält den Schlüssel) oder mit eigenem Schlüssel im Browser
const keyOf=p=>p==="eigen"?"lokal":p==="gemini"?(S.gmode==="konto"?(session?"konto":""):S.gkey):S.ckey;

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

function systemPrompt(p,web){
  if(p==="eigen"){ // kurz halten wie im Training, das kleine Modell hat wenig Kontext
    let s=LOCAL.system;
    if(S.name.trim())s+=` Die Person heißt ${S.name.trim()}.`;
    if(S.about.trim())s+=`\n\nÜber die Person: ${S.about.trim()}`;
    if(S.style.trim())s+=`\n\nSo möchte die Person, dass du antwortest: ${S.style.trim()}`;
    return s;
  }
  const d=new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  let s=`Du bist xbubekir, eine persönliche KI. Du arbeitest für genau eine Person und begleitest sie bei allem, was ansteht: Fragen beantworten, Texte schreiben, Dinge erklären, planen, lernen, nachdenken.

So bist du:
- Du duzt die Person und antwortest in der Sprache, in der sie dir schreibt.
- Du bist direkt, ehrlich und freundlich, ohne Floskeln. Kurze Fragen bekommen kurze Antworten; ausführlich wirst du nur, wenn die Aufgabe es braucht.
- Wenn du etwas nicht weißt oder dir unsicher bist, sagst du das, statt zu raten.
- Fragt dich jemand, wer du bist: Du bist xbubekir. Technisch läufst du auf ${PROV[p].name}, einem KI-Modell von ${PROV[p].by}. Das sagst du offen, wenn danach gefragt wird.
- Deine Antworten werden als Markdown angezeigt: Listen, **fett**, Tabellen und Codeblöcke funktionieren.

Dieses Gespräch hat am ${d} begonnen.`;
  if(web)s+="\n\nDu kannst im Internet suchen. Tu das, wenn eine Frage aktuelle oder nachprüfbare Informationen braucht.";
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

async function send(){
  const text=inp.value.trim();
  if(busy||!text)return;
  if(!keyOf(cur?provOf(cur):S.provider)){openSettings();return}
  if(!cur)cur=newChat();
  if(!chats.includes(cur))chats.unshift(cur);
  if(!cur.title)cur.title=text.replace(/\s+/g," ").slice(0,60);
  const um={role:"user",content:text};
  cur.msgs.push(um);
  inp.value="";grow();
  store(cur);render();
  await run(cur,um);
}

async function run(c,um){
  setBusy(true);
  log.querySelector(".err")?.remove();
  log.insertAdjacentHTML("beforeend",'<div class="msg a" id="live" aria-busy="true"><p class="tool wait">xbubekir denkt nach …</p></div>');
  toBottom(true);
  const live=$("#live"),p=provOf(c);
  let err=null;
  try{await({gemini:askGemini,claude:askClaude,eigen:askLocal}[p])(c,um,live)}
  catch(e){err=e;undo(c,um)}
  stopFn=null;
  if(c.msgs.length)store(c);else forget(c);
  setBusy(false);
  if(c===cur)render();
  if(err&&!err.cancel)showError(err,p);
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
const lstat=$("#lstat"),LFILES=LOCAL.model+"/resolve/main/"; // so legt WebLLM die Modelldateien im Cache „webllm/model“ ab
const clean=t=>t.replace(/<think>[\s\S]*?(<\/think>|$)/g,"").trim(); // falls das Modell doch „nachdenkt“, nicht anzeigen
const NOF16="Deine Grafikkarte oder dein Browser kann die 16-Bit-Rechnungen nicht, die die xbubekir-KI braucht („shader-f16“). Oft hilft es, Chrome oder Edge und den Grafiktreiber zu aktualisieren. Bis dahin kannst du in den Einstellungen Gemini wählen.";
const localErr=(e,what)=>e?.local?e.message:/ShaderModule|shader-f16/i.test(e?.message)?NOF16+` (Meldung: „${e.message}“)`:`Die xbubekir-KI konnte nicht ${what}. Meldung: „${e?.message||e}“`;
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
function localEngine(){
  if(!navigator.gpu)throw Object.assign(new Error("Dieses Gerät oder dieser Browser kann die eigene xbubekir-KI nicht ausführen (WebGPU fehlt). Nimm ein aktuelles Chrome, Edge oder Safari, oder wähl in den Einstellungen Gemini."),{local:true});
  if(!engineP){
    engineP=(async()=>{
      // Die WebLLM-Bibliothek für Qwen3 q4f16 rechnet mit 16-Bit-Zahlen: ohne „shader-f16“ scheitert sie erst nach dem Download
      let a=null;try{a=await navigator.gpu.requestAdapter({powerPreference:"high-performance"})}catch{}
      if(!a?.features?.has("shader-f16"))throw Object.assign(new Error(NOF16),{local:true});
      if(!S.localOk&&!confirm("Die eigene xbubekir-KI lädt beim ersten Start knapp 1 GB herunter, am besten im WLAN. Danach bleibt sie auf diesem Gerät gespeichert. Wird der Download unterbrochen, geht es beim nächsten Mal dort weiter. Jetzt laden?"))
        throw Object.assign(new Error("Download abgebrochen."),{cancel:true});
      S.localOk=true;saveS();persistStore();
      showLoad({});
      const w=await import("./vendor/webllm.js");
      const base=w.prebuiltAppConfig.model_list.find(m=>m.model_id===LOCAL.base);
      return w.CreateMLCEngine(LOCAL.id,{appConfig:{...w.prebuiltAppConfig,model_list:[{...base,model:LOCAL.model,model_id:LOCAL.id,required_features:["shader-f16"]}]},initProgressCallback:showLoad});
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
async function localCached(){ // liegt das Modell schon vollständig auf dem Gerät? Dann darf es ohne Rückfrage vorladen
  try{
    if(!await caches.has("webllm/model"))return false;
    const c=await caches.open("webllm/model"),r=await c.match(LFILES+"tensor-cache.json");
    if(!r)return false;
    const have=new Set((await c.keys()).map(q=>q.url));
    return(await r.json()).records.every(s=>have.has(LFILES+s.dataPath));
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
  if(c===cur&&!inp.value.trim()){inp.value=um.content;grow()}
}

function errText(e,p){
  if(p==="eigen")return localErr(e,"antworten");
  if(p==="gemini"){
    let msg=e?.message||String(e);
    try{msg=JSON.parse(msg.slice(msg.indexOf("{"))).error.message||msg}catch{}
    const s=e?.status;
    if(e instanceof TypeError&&!s)return"Keine Verbindung zu Google. Bist du online?";
    const why=s===429?"Das Gratis-Kontingent ist gerade aufgebraucht. Warte eine Minute und versuch es nochmal. Ist das Tageslimit erreicht, geht es nach Mitternacht kalifornischer Zeit weiter (in Deutschland morgens um 8 oder 9 Uhr). Mit Gemini Flash-Lite (Einstellungen) sind mehr Nachrichten pro Tag drin."
      :s===401||s===403?(S.gmode==="konto"?"Dein xbubekir-Konto hat gerade keinen Zugang. Melde dich in den Einstellungen neu an.":"Der Gemini-Schlüssel wurde abgelehnt. Prüf ihn in den Einstellungen.")
      :s===404?"Das Modell wurde nicht gefunden. Wähl in den Einstellungen ein anderes."
      :s===400?"Google hat die Anfrage abgelehnt."
      :s>=500?"Gemini ist gerade überlastet. Versuch es gleich nochmal."
      :"Unerwarteter Fehler.";
    return`${why} Meldung${s?` (${s})`:""}: „${msg}“`; // Originaltext hilft bei der Fehlersuche
  }
  const A=SDK.claude,msg=e?.error?.error?.message||e?.message||String(e);
  if(!A)return"Unerwarteter Fehler: "+msg;
  if(e instanceof A.AuthenticationError)return"Der Anthropic-Schlüssel wurde abgelehnt. Prüf ihn in den Einstellungen.";
  if(e instanceof A.PermissionDeniedError)return"Dein Schlüssel darf dieses Modell nicht nutzen: "+msg;
  if(e instanceof A.NotFoundError)return"Das Modell wurde nicht gefunden. Wähl in den Einstellungen ein anderes.";
  if(e instanceof A.RateLimitError)return"Gerade zu viele Anfragen. Warte einen Moment und schick die Nachricht nochmal.";
  if(e instanceof A.BadRequestError)return"Anthropic hat die Anfrage abgelehnt: "+msg;
  if(e instanceof A.InternalServerError)return"Claude ist gerade überlastet oder hatte einen Fehler. Versuch es gleich nochmal.";
  if(e instanceof A.APIConnectionError)return"Keine Verbindung zu Anthropic. Bist du online?";
  if(e instanceof A.APIError)return`Fehler ${e.status??""}: ${msg}`;
  return"Unerwarteter Fehler: "+msg;
}
function showError(e,p){
  console.error(e);
  log.insertAdjacentHTML("beforeend",`<p class="err" role="alert">${esc(errText(e,p))} Deine Nachricht steht wieder im Eingabefeld.</p>`);
  toBottom(true);
}

// ---------- Darstellung ----------
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl=u=>/^https?:\/\//i.test(u||"");
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch{return""}};
const link=(u,t)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`;

// Kleiner Markdown-Leser: erst alles escapen, dann nur bekannte Auszeichnungen erzeugen
function inline(s){
  const keep=[],put=h=>`\u0000${keep.push(h)-1}\u0000`;
  s=s.replace(/`([^`\n]+)`/g,(_,c)=>put(`<code>${esc(c)}</code>`));
  s=s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,t,u)=>put(link(u,esc(t))));
  s=s.replace(/https?:\/\/[^\s<>()"\u0000]*[^\s<>()".,;:!?'*_\u0000]/g,u=>put(link(u,esc(u))));
  s=esc(s)
    .replace(/\*\*(?=\S)(.+?)\*\*/g,"<strong>$1</strong>").replace(/(^|[^_\w])__(?=\S)(.+?)__(?![_\w])/g,"$1<strong>$2</strong>")
    .replace(/(^|[^*\w])\*(?=\S)([^*]+?)\*(?![*\w])/g,"$1<em>$2</em>").replace(/(^|[^_\w])_(?=\S)([^_]+?)_(?![_\w])/g,"$1<em>$2</em>")
    .replace(/~~(?=\S)(.+?)~~/g,"<del>$1</del>");
  return s.replace(/\u0000(\d+)\u0000/g,(_,i)=>keep[i]);
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
    if(m=RX.head.exec(l)){const n=Math.min(m[1].length+2,6);out.push(`<h${n}>${inline(m[2])}</h${n}>`);i++;continue}
    if(RX.hr.test(l)){out.push("<hr>");i++;continue}
    if(RX.row.test(l)&&RX.sep.test(L[i+1]||"")){ // Tabelle
      const cells=r=>r.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(c=>c.trim());
      const al=cells(L[i+1]).map(c=>/^:-+:$/.test(c)?' class="c"':/-:$/.test(c)?' class="r"':"");
      const head=cells(l);
      let body="";
      for(i+=2;i<L.length&&RX.row.test(L[i]);i++)body+=`<tr>${cells(L[i]).map((c,j)=>`<td${al[j]||""}>${inline(c)}</td>`).join("")}</tr>`;
      out.push(`<div class="tbl"><table><thead><tr>${head.map((c,j)=>`<th${al[j]||""}>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }
    if(RX.quote.test(l)){const buf=[];while(i<L.length&&RX.quote.test(L[i]))buf.push(L[i++].replace(/^\s*>\s?/,""));out.push(`<blockquote>${md(buf.join("\n"))}</blockquote>`);continue}
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
    out.push(`<p>${buf.map(inline).join("<br>")}</p>`);
  }
  return out.join("");
}
function list(items){
  let h="";const st=[];
  for(const it of items){
    while(st.length&&it.ind<st.at(-1).ind)h+=`</li></${st.pop().tag}>`;
    const top=st.at(-1);
    const tag=it.ord?"ol":"ul";
    if(top&&it.ind===top.ind&&tag!==top.tag)h+=`</li></${st.pop().tag}>`; // Wechsel zwischen Punkt- und Nummernliste
    if(!st.length||it.ind>st.at(-1).ind){st.push({ind:it.ind,tag});h+=`<${tag}${it.ord&&it.start!==1?` start="${it.start}"`:""}><li>`}
    else h+="</li><li>";
    h+=it.text.split("\n").map(inline).join("<br>");
  }
  while(st.length)h+=`</li></${st.pop().tag}>`;
  return h;
}

function viewBlocks(blocks,live){
  let h="",txt="";const cites=new Map();
  const flush=()=>{if(txt.trim())h+=`<div class="md">${md(txt)}</div>`;txt=""};
  blocks.forEach((b,i)=>{
    if(b.type==="text"){txt+=b.text||"";for(const c of b.citations||[])if(safeUrl(c.url)&&!cites.has(c.url))cites.set(c.url,c.title||host(c.url))}
    else if(b.type==="thinking"){flush();if(live&&i===blocks.length-1)h+='<p class="tool wait">xbubekir denkt nach …</p>';else if(b.thinking?.trim())h+=`<details class="think"><summary>Gedankengang</summary><div class="md">${md(b.thinking)}</div></details>`}
    else if(b.type==="server_tool_use"&&b.name==="web_search"){flush();let q="";try{q=b.input?.query||""}catch{}h+=`<p class="tool${live&&i===blocks.length-1?" wait":""}">${IC.search}<span>Sucht im Netz${q?`: „${esc(q)}“`:" …"}</span></p>`}
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
    if(m.role==="user"){h+=`<div class="msg u"><div class="bub">${esc(m.content)}</div></div>`;if(m.note)h+=`<p class="note">${NOTES[m.note]}</p>`;i++;continue}
    const blocks=[];let note="";
    for(;i<M.length&&M[i].role==="assistant";i++)if(!M[i].skip){blocks.push(...toBlocks(M[i]));if(M[i].note)note=M[i].note} // Fortsetzungen (pause_turn) zusammen zeigen
    if(!blocks.length)continue;
    const n=copies.push(blocks.filter(b=>b.type==="text").map(b=>b.text).join("").trim())-1;
    h+=`<div class="msg a">${viewBlocks(blocks,false)}${note?`<p class="note">${NOTES[note]}</p>`:""}<div class="acts-a"><button class="mini" type="button" data-copy="${n}">Kopieren</button></div></div>`;
  }
  return h;
}

function helloHTML(){
  const n=S.name.trim();
  return`<div class="hello"><img src="icons/icon-192.png" alt=""><h2>Hallo${n?", "+esc(n):""}!</h2><p>Ich bin xbubekir, deine persönliche KI. Frag mich etwas, lass mich etwas schreiben oder erklären.</p></div>`;
}
function loginHTML(){
  return`<section class="setup" aria-labelledby="suH"><img src="icons/icon-192.png" alt=""><h2 id="suH">Willkommen bei xbubekir</h2>
<p>Melde dich mit deinem xbubekir-Konto an. Der Gemini-Schlüssel liegt sicher auf deinem eigenen Server, du musst ihn nirgends eingeben.</p>
<label for="suMail">E-Mail</label><input class="f" id="suMail" type="email" autocomplete="username">
<label for="suPw">Passwort</label><input class="f" id="suPw" type="password" autocomplete="current-password">
<div class="dacts"><button class="btn alt" type="button" id="suNew">Konto erstellen</button><button class="btn" type="button" id="suIn">Anmelden</button></div>
<p class="status" id="suMsg" role="status"></p>
<p class="hint">Der Zugang ist nur für dich: Ein neues Konto funktioniert erst, wenn es auf dem Server freigeschaltet ist.</p>
<p class="hint"><button class="linkbtn" type="button" id="suKeyMode">Lieber eigenen Gemini-Schlüssel eingeben</button> · <button class="linkbtn" type="button" id="suSwitch">Claude von Anthropic nutzen (kostenpflichtig)</button></p></section>`;
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
  return`<section class="setup" aria-labelledby="suH"><img src="icons/icon-192.png" alt=""><h2 id="suH">Willkommen bei xbubekir</h2>
${steps}
<label for="suKey">${gem?"Gemini-API-Schlüssel":"Anthropic-API-Schlüssel"}</label>
<div class="keyrow"><input class="f" id="suKey" type="password" autocomplete="off" spellcheck="false" placeholder="${gem?"Schlüssel einfügen":"sk-ant-…"}"><button class="btn" type="button" id="suGo">Los geht’s</button></div>
<p class="hint">${hint}</p>
<p class="status" id="suMsg" role="status"></p>
<p class="hint"><button class="linkbtn" type="button" id="suSwitch">${gem?"Lieber Claude von Anthropic nutzen (kostenpflichtig)":"Lieber Gemini von Google nutzen (kostenlos)"}</button></p></section>`;
}

function render(){
  const ready=!!keyOf(S.provider);
  document.body.classList.toggle("nokey",!ready);
  if(!ready&&S.provider==="gemini"&&S.gmode==="konto"){
    log.innerHTML=loginHTML();
    $("#suIn").onclick=()=>login(false);$("#suNew").onclick=()=>login(true);
    $("#suPw").onkeydown=e=>{if(e.key==="Enter")login(false)};
    $("#suKeyMode").onclick=()=>{S.gmode="key";saveS();render()};
    $("#suSwitch").onclick=()=>{S.provider="claude";S.model=PROV.claude.def;saveS();cur=null;render()};
    return;
  }
  if(!ready){
    log.innerHTML=setupHTML();
    $("#suGo").onclick=()=>checkKey(S.provider,$("#suKey").value,$("#suMsg"),$("#suGo")).then(ok=>{if(ok){saveS();render();inp.focus()}});
    $("#suKey").onkeydown=e=>{if(e.key==="Enter")$("#suGo").click()};
    $("#suSwitch").onclick=()=>{S.provider=S.provider==="gemini"?"claude":"gemini";S.model=PROV[S.provider].def;S.gmode="konto";saveS();cur=null;render()};
    return;
  }
  const st=log.scrollTop,stick=nearBottom();
  log.innerHTML=cur&&cur.msgs.length?chatHTML(cur):helloHTML();
  log.scrollTop=st;if(stick)toBottom(true);
  updSend();
}

let raf=0,pending=null;
function paint(el,blocks){ // beim Streamen höchstens einmal pro Bild neu zeichnen
  pending=blocks;
  if(raf)return;
  raf=requestAnimationFrame(()=>{raf=0;if(!el.isConnected)return;const stick=nearBottom();el.innerHTML=viewBlocks(pending,true);if(stick)toBottom(true)});
}
const nearBottom=()=>log.scrollHeight-log.scrollTop-log.clientHeight<90;
function toBottom(){log.scrollTop=log.scrollHeight}

function setBusy(b){busy=b;bSend.innerHTML=b?IC.stop:IC.send;bSend.setAttribute("aria-label",b?"Antwort anhalten":"Senden");updSend()}
function updSend(){bSend.disabled=!busy&&!inp.value.trim()}
function grow(){inp.style.height="auto";inp.style.height=Math.min(inp.scrollHeight+2,innerHeight*.4)+"px";updSend()}

// ---------- Chats verwalten ----------
function store(c){c.updated=Date.now();chats.sort((a,b)=>b.updated-a.updated);DB.put(c)}
function forget(c){chats=chats.filter(x=>x!==c);DB.del(c.id)}
function openChat(c){if(busy)return;cur=c;dChats.close();log.scrollTop=0;render();toBottom()}
function startNew(){if(busy)return;cur=null;dChats.open&&dChats.close();render();inp.focus()}
function when(t){
  const d=new Date(t),now=new Date();
  if(d.toDateString()===now.toDateString())return d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  return d.toLocaleDateString("de-DE",{day:"numeric",month:"short",...(d.getFullYear()!==now.getFullYear()?{year:"numeric"}:{})});
}
function renderList(){
  const ul=$("#chList");
  ul.innerHTML=chats.length?chats.map(c=>`<li${c===cur?' class="on"':""}><button class="open" type="button" data-id="${esc(c.id)}"><b>${esc(c.title||"Ohne Titel")}</b><small>${when(c.updated)} · ${esc(MODELS[c.model]?.name||c.model)}</small></button><button class="ib" type="button" data-del="${esc(c.id)}" aria-label="Chat „${esc(c.title)}“ löschen" title="Löschen">${IC.del}</button></li>`).join(""):"";
  if(!chats.length)ul.innerHTML='<li class="empty">Noch keine Chats.</li>';
}

// ---------- Einstellungen ----------
function fillModels(){ // Modellauswahl passend zum gewählten Anbieter
  const p=$("#sProv").value,sel=$("#sModel"),was=sel.value;
  sel.innerHTML=Object.entries(MODELS).filter(([,M])=>M.p===p).map(([id,M])=>`<option value="${id}">${M.name.replace(/^(Claude|Gemini) /,"")} – ${M.hint}</option>`).join("");
  sel.value=MODELS[was]?.p===p?was:PROV[p].def;
  $("#kGemini").hidden=p!=="gemini";$("#kClaude").hidden=p!=="claude";$("#kEigen").hidden=p!=="eigen";
  const konto=$("#sGMode").value==="konto";
  $("#kKonto").hidden=!konto;$("#kGKey").hidden=konto;
  $("#kontoInfo").textContent=session?`Angemeldet als ${session.user.email}.`:"Nicht angemeldet. Nach dem Speichern erscheint die Anmeldung.";
  $("#bLogout").hidden=!session;
  costHint();
}
function costHint(){
  const M=MODELS[$("#sModel").value];
  $("#sWeb").disabled=!M.web;
  $("#costHint").textContent=M.p==="eigen"
    ?"Kostenlos und ohne Konto: Die eigene xbubekir-KI läuft komplett auf diesem Gerät, nichts wird an einen Server geschickt. Beim ersten Start etwa 1 GB Download. Sie ist kleiner als Gemini und irrt sich öfter, eine Websuche gibt es nicht."
    :M.p==="gemini"
    ?"Kostenlos. Google begrenzt dafür die Nachrichten pro Minute und pro Tag; die genauen Grenzen zeigt AI Studio. Das Tageslimit setzt sich um Mitternacht kalifornischer Zeit zurück. Flash-Lite erlaubt mehr Nachrichten. Eine Websuche gibt es mit Gemini hier nicht."
    :`${M.name} kostet ${M.price} pro Million Tokens, also Wortteile (Eingabe / Ausgabe). Eine normale Nachricht kostet damit meist ein paar Cent oder weniger, jede Websuche etwa einen Cent extra.${M.web?"":" Mit diesem Modell gibt es keine Websuche."}`;
}
function openSettings(){
  for(const[id,v]of[["sGKey",S.gkey],["sCKey",S.ckey]]){const k=$("#"+id);k.value=v;k.type="password"}
  document.querySelectorAll(".eye").forEach(b=>{b.textContent="Zeigen";b.setAttribute("aria-pressed","false")});
  $("#sName").value=S.name;$("#sAbout").value=S.about;$("#sStyle").value=S.style;
  $("#sProv").value=S.provider;$("#sGMode").value=S.gmode;$("#sModel").value=S.model;fillModels();
  $("#sEffort").value=S.effort;$("#sWeb").checked=S.web;
  $("#setMsg").textContent="";
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
    if(bad){msgEl.textContent=p==="gemini"?"Google hat den Schlüssel abgelehnt. Prüf, ob du ihn vollständig kopiert hast.":errText(e,p);msgEl.classList.add("bad");return false}
    keep();msgEl.textContent="Konnte den Schlüssel gerade nicht prüfen, er ist trotzdem gespeichert.";return true;
  }finally{btn.disabled=false}
}

$("#fSet").addEventListener("submit",async e=>{
  e.preventDefault();
  S.name=$("#sName").value;S.about=$("#sAbout").value;S.style=$("#sStyle").value;
  if($("#sProv").value!==S.provider&&!busy)cur=null; // anderer Anbieter: gleich mit einem neuen Chat weitermachen
  S.provider=$("#sProv").value;S.gmode=$("#sGMode").value;S.model=$("#sModel").value;S.effort=$("#sEffort").value;S.web=$("#sWeb").checked;saveS();
  for(const[p,id]of[["gemini","sGKey"],["claude","sCKey"]]){
    const key=$("#"+id).value.trim();
    if(key===(p==="gemini"?S.gkey:S.ckey))continue;
    if(!key){if(p==="gemini")S.gkey="";else S.ckey="";saveS();continue}
    if(!await checkKey(p,key,$("#setMsg"),$("#bSave")))return;
  }
  dSet.close();if(!busy)render();
  if(S.provider==="eigen")preloadLocal(); // gleich im Hintergrund laden, dann ist sie beim Tippen schon bereit
});
$("#sProv").addEventListener("change",fillModels);
$("#sGMode").addEventListener("change",fillModels);
$("#bLogout").addEventListener("click",async()=>{if(busy)return;await(await auth()).signOut();session=null;dSet.close();render()});
$("#sModel").addEventListener("change",costHint);
document.querySelectorAll(".eye").forEach(b=>b.addEventListener("click",()=>{const k=$("#"+b.dataset.for),show=k.type==="password";k.type=show?"text":"password";b.textContent=show?"Verbergen":"Zeigen";b.setAttribute("aria-pressed",String(show))}));
$("#bWipeChats").addEventListener("click",()=>{if(busy||!confirm("Wirklich alle Chats auf diesem Gerät löschen?"))return;chats=[];cur=null;DB.clear();dSet.close();render()});
$("#bWipeKey").addEventListener("click",()=>{if(busy||!confirm("Alle API-Schlüssel von diesem Gerät entfernen?"))return;S.gkey="";S.ckey="";saveS();dSet.close();render()});

// ---------- Bedienung ----------
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>b.closest("dialog").close()));
for(const d of[dSet,dChats])d.addEventListener("click",e=>{if(e.target===d)d.close()}); // Klick neben das Fenster schließt
$("#bSet").addEventListener("click",openSettings);
$("#bNew").addEventListener("click",startNew);
$("#bNew2").addEventListener("click",startNew);
$("#bMenu").addEventListener("click",()=>{renderList();dChats.showModal()});
$("#chList").addEventListener("click",e=>{
  const o=e.target.closest("[data-id]"),d=e.target.closest("[data-del]");
  if(o)openChat(chats.find(c=>c.id===o.dataset.id));
  if(d){const c=chats.find(x=>x.id===d.dataset.del);if(!c||(busy&&c===cur)||!confirm(`Chat „${c.title}“ löschen?`))return;forget(c);if(c===cur){cur=null;render()}renderList()}
});
log.addEventListener("click",e=>{
  const b=e.target.closest("[data-copy]");if(!b)return;
  navigator.clipboard?.writeText(copies[b.dataset.copy]).then(()=>{b.textContent="Kopiert";setTimeout(()=>b.textContent="Kopieren",1500)},()=>{});
});
$("#composer").addEventListener("submit",e=>{e.preventDefault();if(busy)stopFn?.();else send()});
const desk=matchMedia("(hover:hover) and (pointer:fine)"); // am Rechner schickt Enter ab, am Handy macht Enter eine neue Zeile
inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&desk.matches){e.preventDefault();send()}});
inp.addEventListener("input",grow);

setBusy(false);
if(S.gmode==="konto"||location.hash.includes("access_token")){try{session=(await(await auth()).getSession()).data.session}catch{}} // auch Rückkehr aus der Bestätigungs-Mail
try{chats=(await DB.all()).sort((a,b)=>b.updated-a.updated)}catch{chats=[]}
render();
if(keyOf(S.provider)&&desk.matches)inp.focus();
if(S.provider==="eigen"&&navigator.gpu&&await localCached())preloadLocal(); // schon gespeichert: in den Grafikspeicher laden, während man tippt
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
