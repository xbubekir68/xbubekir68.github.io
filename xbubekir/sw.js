// xbubekir Service Worker: App-Hülle offline, Anfragen an Server, Google und Anthropic nie aus dem Cache.
// Außerdem die eigene KI für Grafikkarten ohne 16-Bit („shader-f16“): Die WebLLM-Bibliothek q4f32_1 braucht dieselben Dateien wie q4f16_1,
// nur Skalen und Normen als bfloat16 statt float16 (gleiche Größe, gleiche Offsets). Unter q4f32/resolve/main/ entsteht diese Fassung
// aus den q4f16-Dateien: zuerst aus dem schon geladenen WebLLM-Cache, sonst von Hugging Face.
const V="xb-v9",SHELL=["./","index.html","app.js","manifest.webmanifest","vendor/genai.js","vendor/supabase.js","vendor/anthropic.js","icons/icon-192.png","icons/icon-512.png","icons/favicon-64.png","icons/icon-180.png"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  // nur eigene alte Caches löschen: Mufradaat und WebLLM (Modell der eigenen KI) teilen sich dieselbe Herkunft
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("xb-")&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
const F16SRC="https://huggingface.co/xbubekir/xbubekir-qwen3-1.7b-q4f16_1-MLC/resolve/main/",F32PATH=new URL("q4f32/resolve/main/",location.href).pathname;
const BF=new Uint16Array(65536); // float16-Bits → bfloat16-Bits, gerundet wie TVM (_convert_f32_to_bf16: zur nächsten, bei Gleichstand gerade)
{const f=new Float32Array(1),u=new Uint32Array(f.buffer);
  for(let h=0;h<65536;h++){
    const e=h>>10&31,m=h&1023;
    f[0]=(h>>15?-1:1)*(e===31?(m?NaN:3.3895313892515355e38):e?(1024+m)*2**(e-25):m*2**-24); // ±∞ wie bei TVM auf den größten bfloat16-Wert
    BF[h]=(u[0]+(u[0]>>>16&1)+0x7fff)>>>16;
  }
}
let f16idx=null; // dataPath → float16-Einträge der q4f16-Fassung
async function src(n){
  const r=await caches.match(F16SRC+n,{cacheName:"webllm/model"})||await fetch(F16SRC+n);
  if(!r.ok)throw new Error(`${n}: HTTP ${r.status}`);
  return r;
}
async function f32File(n){
  if(n==="sw-ok")return new Response(V); // die Seite prüft damit, ob dieser Service-Worker schon übernommen hat
  if(n==="tensor-cache.json"||n==="mlc-chat-config.json"){
    const j=await(await src(n)).json();
    if(n==="mlc-chat-config.json")j.quantization="q4f32_1";
    else for(const s of j.records)for(const r of s.records)if(r.dtype==="float16")r.dtype="float32";
    return new Response(JSON.stringify(j),{headers:{"content-type":"application/json"}});
  }
  const r=await src(n);
  if(!/^params_shard_\d+\.bin$/.test(n))return new Response(r.body,{headers:{"content-type":r.headers.get("content-type")||"application/octet-stream"}});
  f16idx??=new Map((await(await src("tensor-cache.json")).json()).records.map(s=>[s.dataPath,s.records.filter(x=>x.dtype==="float16")]));
  const b=await r.arrayBuffer();
  for(const x of f16idx.get(n)||[]){const v=new Uint16Array(b,x.byteOffset,x.nbytes/2);for(let i=0;i<v.length;i++)v[i]=BF[v[i]]}
  return new Response(b,{headers:{"content-type":"application/octet-stream"}});
}
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return; // eigener Server, Google- und Anthropic-API bleiben unberührt
  if(u.pathname.startsWith(F32PATH)){e.respondWith(f32File(u.pathname.slice(F32PATH.length)).catch(err=>new Response(String(err?.message||err),{status:502})));return}
  const key=r.mode==="navigate"?"index.html":r; // erst Netz (immer revalidiert, damit Updates sofort ankommen), offline aus dem Cache
  e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(key,cp))}return res}).catch(()=>caches.match(key).then(m=>m||caches.match("./"))));
});
