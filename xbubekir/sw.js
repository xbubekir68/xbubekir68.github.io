// xbubekir Service Worker: App-Hülle offline, Anfragen an Server und Google nie aus dem Cache.
const V="xb-v36",SHELL=["./","index.html","app.js","manifest.webmanifest","voice-worklet.js","vendor/genai.js","vendor/supabase.js","vendor/temml.js","icons/icon-192.png","icons/icon-512.png","icons/favicon-64.png","icons/icon-180.png","brand/wortmarke.webp","brand/xbu.webp"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  // nur eigene alte Caches löschen (Mufradaat teilt sich dieselbe Herkunft), dazu das Modell der früheren eigenen KI (webllm/…, rund 1 GB)
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("xb-")&&k!==V||k.startsWith("webllm/")).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return; // eigener Server und Google-API bleiben unberührt
  const key=r.mode==="navigate"?"index.html":r; // erst Netz (immer revalidiert, damit Updates sofort ankommen), offline aus dem Cache
  e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(key,cp))}return res}).catch(()=>caches.match(key).then(m=>m||caches.match("./"))));
});
