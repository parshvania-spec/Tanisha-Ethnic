const CACHE='tanisha-v41-storefront';
const CORE=['/','/index.html','/styles.css','/app.js','/menu.js','/config.js','/brand-round.png','/brand-transparent.png','/favicon-192.png','/icon-192.png','/icon-512.png','/product-placeholder.svg','/manifest.webmanifest'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))]))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const isPage=event.request.mode==='navigate'||event.request.destination==='document';
  const isCode=['script','style'].includes(event.request.destination)||/\.(js|css)$/.test(url.pathname);
  if(isPage||isCode){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response}).catch(()=>caches.match(event.request).then(response=>response||caches.match('/index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>{const network=fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response});return cached||network}));
});
