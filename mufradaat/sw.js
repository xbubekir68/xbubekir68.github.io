// Mufradaat Service Worker: App-Hülle offline, Anmeldung/Sync nie aus dem Cache.
const V="mfr-v3",SHELL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/favicon-64.png","icons/icon-180.png","fonts/noto-naskh-arabic-500.woff2","fonts/noto-naskh-arabic-700.woff2","vendor/supabase.js"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return; // Supabase & CDN bleiben unberührt
  const page=r.mode==="navigate";
  if(page){ // Seite: erst Netz (damit Updates ankommen), sonst Cache
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put("index.html",cp));return res}).catch(()=>caches.match("index.html").then(m=>m||caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res})));
});
