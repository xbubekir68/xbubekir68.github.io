// xbubekir Service Worker: App-Hülle offline, Anfragen an Server, Google und Anthropic nie aus dem Cache.
const V="xb-v4",SHELL=["./","index.html","app.js","manifest.webmanifest","vendor/genai.js","vendor/supabase.js","vendor/anthropic.js","icons/icon-192.png","icons/icon-512.png","icons/favicon-64.png","icons/icon-180.png"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return; // eigener Server, Google- und Anthropic-API bleiben unberührt
  const key=r.mode==="navigate"?"index.html":r; // erst Netz (immer revalidiert, damit Updates sofort ankommen), offline aus dem Cache
  e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(key,cp))}return res}).catch(()=>caches.match(key).then(m=>m||caches.match("./"))));
});
