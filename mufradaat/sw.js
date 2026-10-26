// Mufradaat Service Worker: App-Hülle offline, Anmeldung/Sync nie aus dem Cache.
const V="mfr-v22",AC="mfr-audio",SHELL=["./","index.html","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/favicon-64.png","icons/icon-180.png","fonts/noto-naskh-arabic-500.woff2","fonts/noto-naskh-arabic-700.woff2","brand/mufradaat.webp","vendor/supabase.js","kurs/kurs.json","kurs/s1.json","kurs/s2.json"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==AC).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll({includeUncontrolled:true})).then(cs=>cs.forEach(c=>c.postMessage({v:V})))); // offene Seiten erfahren die neue Version
});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET"||u.origin!==location.origin)return; // Supabase & CDN bleiben unberührt
  if(/\/audio\/audio\.json$/.test(u.pathname)||/\/kurs\/[^/]+\.json$/.test(u.pathname)){ // Audioliste und Kursdateien: erst Netz, damit Korrekturen sofort ankommen
    e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r)));
    return;
  }
  if(/\/audio\//.test(u.pathname)){e.respondWith(audio(r));return} // Audio: eigener Cache, bleibt bei App-Updates erhalten
  const page=r.mode==="navigate";
  if(page){ // Seite: erst Netz, immer revalidiert (damit Updates sofort ankommen, nicht erst nach dem HTTP-Cache von GitHub Pages), sonst Cache
    e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put("index.html",cp));return res}).catch(()=>caches.match("index.html").then(m=>m||caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res})));
});
// Audiodateien einmal ganz laden und speichern; Bereichsanfragen (Safari, Audio-Element) aus dem Cache beantworten
async function audio(r){
  const c=await caches.open(AC);let m=await c.match(r.url);
  if(!m){const res=await fetch(r.url);if(!res.ok)return res;await c.put(r.url,res.clone());m=res}
  const rg=/bytes=(\d*)-(\d*)/.exec(r.headers.get("range")||"");if(!rg)return m;
  const b=await m.blob(),st=+rg[1]||0,en=rg[2]?Math.min(+rg[2],b.size-1):b.size-1;
  return new Response(b.slice(st,en+1),{status:206,headers:{"Content-Type":m.headers.get("Content-Type")||"audio/mpeg","Content-Range":`bytes ${st}-${en}/${b.size}`,"Content-Length":String(en-st+1),"Accept-Ranges":"bytes"}});
}
