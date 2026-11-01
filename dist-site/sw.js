const C='sa-mvxgzhmi';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const keep=(q,r)=>{if(r.ok||r.type==='opaque'){const cl=r.clone();caches.open(C).then(c=>c.put(q,cl))}return r};
self.addEventListener('fetch',e=>{const q=e.request,u=new URL(q.url);if(q.method!=='GET')return;
// La app (HTML) se abre al instante desde la copia guardada y se actualiza en segundo plano;
// si llega una versión distinta, se avisa a la página para que ofrezca recargar.
if(q.mode==='navigate'){e.respondWith(caches.match('index.html').then(hit=>{
const net=fetch(q).then(r=>{if(r.ok){const tag=x=>x&&(x.headers.get('etag')||x.headers.get('last-modified'));
if(hit&&tag(r)!==tag(hit))e.waitUntil(self.clients.matchAll().then(cs=>cs.forEach(c=>c.postMessage('sa-update'))));keep('index.html',r)}return r});
if(hit){e.waitUntil(net.catch(()=>{}));return hit}return net}));return}
// Solo se guardan recursos propios y fuentes; la liga (Supabase) nunca se sirve desde caché.
if(u.origin!==location.origin&&!/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))return;
e.respondWith(caches.match(q).then(hit=>{const net=fetch(q).then(r=>keep(q,r)).catch(()=>hit);return hit||net}))});
