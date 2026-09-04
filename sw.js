/* Route 66 · Família Voltas — service worker
   Cache-first para o app, network-first silencioso para atualizar. */
var CACHE = 'r66-blindado-v6';
var CORE = [
  './','./index.html','./manifest.webmanifest',
  './icon-192.png','./icon-512.png','./icon-mask.png','./apple-touch-icon.png','./capa.jpg'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(CORE.map(function(u){
        return fetch(new Request(u, {cache:'reload'})).then(function(res){
          if(res && res.ok) return c.put(u, res);
        }).catch(function(){});
      }));
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('message', function(e){
  if(e.data && e.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);

  // Google Fonts: cache-first, guardado para sempre (resolve o offline das fontes)
  if(url.hostname.indexOf('fonts.googleapis.com')>-1 || url.hostname.indexOf('fonts.gstatic.com')>-1){
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match(req).then(function(hit){
          if(hit) return hit;
          return fetch(req).then(function(res){
            if(res && (res.ok || res.type==='opaque')) c.put(req, res.clone());
            return res;
          }).catch(function(){ return hit; });
        });
      })
    );
    return;
  }

  // navegacao (abrir o app): rede primeiro, cache como rede de seguranca
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(hit){
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  // mesma origem: cache-first, atualiza em segundo plano
  if(url.origin === location.origin){
    e.respondWith(
      caches.match(req).then(function(hit){
        var live = fetch(req).then(function(res){
          if(res && res.ok){
            var copy = res.clone();
            caches.open(CACHE).then(function(c){ c.put(req, copy); });
          }
          return res;
        }).catch(function(){ return hit; });
        return hit || live;
      })
    );
  }
});
