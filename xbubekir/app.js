// xbubekir: persönliche KI im Browser. Denkt mit Claude (Anthropic-API, eigener Schlüssel), speichert alles nur auf diesem Gerät.
import Anthropic from "./vendor/anthropic.js";

// web: Websuch-Werkzeug des Modells (null = keine Websuche); fb: serverseitiger Ersatz bei Ablehnung durch Sicherheitsfilter
const MODELS={
  "claude-opus-5-5":{name:"Claude Opus 5.5",hint:"am klügsten",price:"4 $ / 20 $",web:"web_search_20260209",fb:true},
  "claude-sonnet-5-5":{name:"Claude Sonnet 5.5",hint:"schneller, günstiger",price:"2 $ / 10 $",web:"web_search_20260209",fb:true},
  "claude-haiku-5-5":{name:"Claude Haiku 5.5",hint:"am günstigsten",price:"0,10 $ / 0,50 $",web:null,fb:false},
};
const DEF="claude-opus-5-5",MAX_TOKENS=64000;
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
const S={key:"",name:"",about:"",style:"",model:DEF,effort:"medium",web:true};
try{Object.assign(S,JSON.parse(localStorage.getItem(SK)||"{}"))}catch{}
if(!MODELS[S.model])S.model=DEF;
function saveS(){try{localStorage.setItem(SK,JSON.stringify(S))}catch{}}

// ---------- Chats (können groß werden, daher IndexedDB; ohne IndexedDB nur im Speicher) ----------
const DB=(()=>{
  let p;
  const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open("xbubekir",1);r.onupgradeneeded=()=>r.result.createObjectStore("chats",{keyPath:"id"});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
  const tx=(mode,fn)=>open().then(d=>new Promise((res,rej)=>{const t=d.transaction("chats",mode),q=fn(t.objectStore("chats"));t.oncomplete=()=>res(q.result);t.onerror=()=>rej(t.error)}));
  const safe=f=>(...a)=>f(...a).catch(e=>{console.warn("xbubekir: Speichern nicht möglich",e)});
  return{all:()=>tx("readonly",s=>s.getAll()),put:safe(c=>tx("readwrite",s=>s.put(c))),del:safe(id=>tx("readwrite",s=>s.delete(id))),clear:safe(()=>tx("readwrite",s=>s.clear()))};
})();

let chats=[],cur=null,busy=false,stream=null,copies=[];

// ---------- Claude ----------
let _client,_ck;
function client(){if(_ck!==S.key){_client=new Anthropic({apiKey:S.key,dangerouslyAllowBrowser:true});_ck=S.key}return _client} // Schlüssel des Nutzers, nur auf seinem Gerät

function systemPrompt(web){
  const d=new Date().toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  let s=`Du bist xbubekir, eine persönliche KI. Du arbeitest für genau eine Person und begleitest sie bei allem, was ansteht: Fragen beantworten, Texte schreiben, Dinge erklären, planen, lernen, nachdenken.

So bist du:
- Du duzt die Person und antwortest in der Sprache, in der sie dir schreibt.
- Du bist direkt, ehrlich und freundlich, ohne Floskeln. Kurze Fragen bekommen kurze Antworten; ausführlich wirst du nur, wenn die Aufgabe es braucht.
- Wenn du etwas nicht weißt oder dir unsicher bist, sagst du das, statt zu raten.
- Fragt dich jemand, wer du bist: Du bist xbubekir. Technisch läufst du auf Claude, einem KI-Modell von Anthropic. Das sagst du offen, wenn danach gefragt wird.
- Deine Antworten werden als Markdown angezeigt: Listen, **fett**, Tabellen und Codeblöcke funktionieren.

Dieses Gespräch hat am ${d} begonnen.`;
  if(web)s+="\n\nDu kannst im Internet suchen. Tu das, wenn eine Frage aktuelle oder nachprüfbare Informationen braucht.";
  if(S.name.trim())s+=`\n\nDie Person heißt ${S.name.trim()}.`;
  if(S.about.trim())s+=`\n\nDas hat dir die Person über sich erzählt:\n${S.about.trim()}`;
  if(S.style.trim())s+=`\n\nSo möchte die Person, dass du antwortest:\n${S.style.trim()}`;
  return s;
}

// System-Prompt, Werkzeuge und Modell werden beim Anlegen festgehalten: Sie müssen für alle Runden eines Chats gleich bleiben,
// sonst verwirft die API die gespeicherten Denkblöcke früherer Antworten (und der Prompt-Cache greift nicht mehr).
function newChat(){
  const model=MODELS[S.model]?S.model:DEF,M=MODELS[model],web=S.web&&!!M.web;
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;
  return{id:crypto.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2),title:"",created:Date.now(),updated:Date.now(),model,
    system:systemPrompt(web),tools:web?[{type:M.web,name:"web_search",max_uses:5,user_location:{type:"approximate",...(tz?{timezone:tz}:{})}}]:[],msgs:[]};
}

function params(c){
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

async function send(){
  const text=inp.value.trim();
  if(busy||!text)return;
  if(!S.key){openSettings();return}
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
  const live=$("#live"),start=c.msgs.indexOf(um);
  let prev=[],err=null,rounds=0;
  try{
    for(;;){
      stream=client().beta.messages.stream(params(c));
      for await(const _ of stream)paint(live,prev.concat(stream.currentMessage?.content||[]));
      const msg=await stream.finalMessage();
      if(msg.stop_reason==="refusal"){ // auch das Ersatzmodell hat abgelehnt: Teilantwort verwerfen, Frage aus dem Verlauf nehmen
        for(const m of c.msgs.slice(start))m.skip=true;
        um.note="refusal";break;
      }
      const content=replay(msg.content);
      c.msgs.push({role:"assistant",content,...(msg.stop_reason==="max_tokens"?{note:"cut"}:{})});
      if(msg.stop_reason==="pause_turn"&&++rounds<5){prev=prev.concat(content);continue} // lange Websuche: einfach weiterlaufen lassen
      break;
    }
  }catch(e){
    if(e instanceof Anthropic.APIUserAbortError){ // Stopp gedrückt: bisherigen Text behalten (ohne Denkblöcke, die wären unvollständig)
      const part=(stream.currentMessage?.content||[]).filter(b=>b.type==="text"&&b.text).map(b=>({type:"text",text:b.text}));
      if(part.length)c.msgs.push({role:"assistant",content:part,note:"stop"});
      else if(c.msgs.at(-1)===um)undo(c,um);
    }else{err=e;undo(c,um)}
  }
  stream=null;
  if(c.msgs.length)store(c);else forget(c);
  setBusy(false);
  if(c===cur)render();
  if(err)showError(err);
}

// Fehlgeschlagene Runde ganz entfernen (nur das Ende des Verlaufs) und die Nachricht zurück ins Eingabefeld legen
function undo(c,um){
  c.msgs.splice(c.msgs.indexOf(um));
  if(c===cur&&!inp.value.trim()){inp.value=um.content;grow()}
}

function errText(e){
  const msg=e.error?.error?.message||e.message||String(e);
  if(e instanceof Anthropic.AuthenticationError)return"Der API-Schlüssel wurde abgelehnt. Prüf ihn in den Einstellungen.";
  if(e instanceof Anthropic.PermissionDeniedError)return"Dein Schlüssel darf dieses Modell nicht nutzen: "+msg;
  if(e instanceof Anthropic.NotFoundError)return"Das Modell wurde nicht gefunden. Wähl in den Einstellungen ein anderes.";
  if(e instanceof Anthropic.RateLimitError)return"Gerade zu viele Anfragen. Warte einen Moment und schick die Nachricht nochmal.";
  if(e instanceof Anthropic.BadRequestError)return"Anthropic hat die Anfrage abgelehnt: "+msg;
  if(e instanceof Anthropic.InternalServerError)return"Claude ist gerade überlastet oder hatte einen Fehler. Versuch es gleich nochmal.";
  if(e instanceof Anthropic.APIConnectionError)return"Keine Verbindung zu Anthropic. Bist du online?";
  if(e instanceof Anthropic.APIError)return`Fehler ${e.status??""}: ${msg}`;
  return"Unerwarteter Fehler: "+msg;
}
function showError(e){
  console.error(e);
  log.insertAdjacentHTML("beforeend",`<p class="err" role="alert">${esc(errText(e))} Deine Nachricht steht wieder im Eingabefeld.</p>`);
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
  let h="";const M=c.msgs;copies=[];
  for(let i=0;i<M.length;){
    const m=M[i];
    if(m.role==="user"){h+=`<div class="msg u"><div class="bub">${esc(m.content)}</div></div>`;if(m.note)h+=`<p class="note">${NOTES[m.note]}</p>`;i++;continue}
    const blocks=[];let note="";
    for(;i<M.length&&M[i].role==="assistant";i++)if(!M[i].skip){blocks.push(...M[i].content);if(M[i].note)note=M[i].note} // Fortsetzungen (pause_turn) zusammen zeigen
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
function setupHTML(){
  return`<section class="setup" aria-labelledby="suH"><img src="icons/icon-192.png" alt=""><h2 id="suH">Willkommen bei xbubekir</h2>
<p>xbubekir ist deine persönliche KI. Das Denken übernimmt Claude von Anthropic. Dafür brauchst du einmalig einen eigenen API-Schlüssel:</p>
<ol><li>Auf ${link("https://platform.claude.com/","platform.claude.com")} anmelden und unter „Billing“ etwas Guthaben aufladen.</li>
<li>Unter „API Keys“ einen neuen Schlüssel erstellen.</li>
<li>Den Schlüssel (beginnt mit <code>sk-ant-</code>) hier einfügen.</li></ol>
<label for="suKey">API-Schlüssel</label>
<div class="keyrow"><input class="f" id="suKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…"><button class="btn" type="button" id="suGo">Los geht’s</button></div>
<p class="hint">Der Schlüssel bleibt nur auf diesem Gerät und wird nur an api.anthropic.com geschickt. Abgerechnet wird nach Nutzung über dein Anthropic-Konto. Setz dir dort am besten ein monatliches Limit.</p>
<p class="status" id="suMsg" role="status"></p></section>`;
}

function render(){
  document.body.classList.toggle("nokey",!S.key);
  if(!S.key){log.innerHTML=setupHTML();$("#suGo").onclick=()=>checkKey($("#suKey").value,$("#suMsg"),$("#suGo")).then(ok=>{if(ok){render();inp.focus()}});$("#suKey").onkeydown=e=>{if(e.key==="Enter")$("#suGo").click()};return}
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
function costHint(){
  const M=MODELS[$("#sModel").value];
  $("#sWeb").disabled=!M.web;
  $("#costHint").textContent=`${M.name} kostet ${M.price} pro Million Tokens, also Wortteile (Eingabe / Ausgabe). Eine normale Nachricht kostet damit meist ein paar Cent oder weniger, jede Websuche etwa einen Cent extra.${M.web?"":" Mit diesem Modell gibt es keine Websuche."}`;
}
function openSettings(){
  $("#sKey").value=S.key;$("#sKey").type="password";$("#bEye").textContent="Zeigen";$("#bEye").setAttribute("aria-pressed","false");
  $("#sName").value=S.name;$("#sAbout").value=S.about;$("#sStyle").value=S.style;
  $("#sModel").value=S.model;$("#sEffort").value=S.effort;$("#sWeb").checked=S.web;
  $("#setMsg").textContent="";costHint();
  dSet.showModal();
}
async function checkKey(key,msgEl,btn){ // Schlüssel einmal kostenlos prüfen (Modellabfrage), bevor er gespeichert wird
  key=key.trim();
  msgEl.className="status";
  if(!key){msgEl.textContent="Bitte füg deinen Schlüssel ein.";msgEl.classList.add("bad");return false}
  btn.disabled=true;msgEl.textContent="Prüfe den Schlüssel …";
  try{
    await new Anthropic({apiKey:key,dangerouslyAllowBrowser:true}).models.retrieve(S.model);
    S.key=key;saveS();msgEl.textContent="Schlüssel funktioniert.";return true;
  }catch(e){
    if(e instanceof Anthropic.AuthenticationError||e instanceof Anthropic.PermissionDeniedError){msgEl.textContent=errText(e);msgEl.classList.add("bad");return false}
    S.key=key;saveS();msgEl.textContent="Konnte den Schlüssel gerade nicht prüfen, er ist trotzdem gespeichert.";return true;
  }finally{btn.disabled=false}
}

$("#fSet").addEventListener("submit",async e=>{
  e.preventDefault();
  S.name=$("#sName").value;S.about=$("#sAbout").value;S.style=$("#sStyle").value;
  S.model=$("#sModel").value;S.effort=$("#sEffort").value;S.web=$("#sWeb").checked;saveS();
  const key=$("#sKey").value.trim();
  if(key!==S.key&&!await checkKey(key,$("#setMsg"),$("#bSave")))return;
  dSet.close();if(!busy)render();
});
$("#sModel").innerHTML=Object.entries(MODELS).map(([id,M])=>`<option value="${id}">${M.name.replace("Claude ","")} – ${M.hint}</option>`).join("");
$("#sModel").addEventListener("change",costHint);
$("#bEye").addEventListener("click",()=>{const k=$("#sKey"),show=k.type==="password";k.type=show?"text":"password";$("#bEye").textContent=show?"Verbergen":"Zeigen";$("#bEye").setAttribute("aria-pressed",String(show))});
$("#bWipeChats").addEventListener("click",()=>{if(busy||!confirm("Wirklich alle Chats auf diesem Gerät löschen?"))return;chats=[];cur=null;DB.clear();dSet.close();render()});
$("#bWipeKey").addEventListener("click",()=>{if(busy||!confirm("API-Schlüssel von diesem Gerät entfernen?"))return;S.key="";saveS();dSet.close();render()});

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
$("#composer").addEventListener("submit",e=>{e.preventDefault();if(busy)stream?.abort();else send()});
const desk=matchMedia("(hover:hover) and (pointer:fine)"); // am Rechner schickt Enter ab, am Handy macht Enter eine neue Zeile
inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&desk.matches){e.preventDefault();send()}});
inp.addEventListener("input",grow);

setBusy(false);
try{chats=(await DB.all()).sort((a,b)=>b.updated-a.updated)}catch{chats=[]}
render();
if(S.key&&desk.matches)inp.focus();
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
