/* Service worker — RelatPost. Dados ficam no aparelho e, se ativado, no Supabase (nunca em cache aqui). */
const CACHE = 'relatpost-v13';
const CORE = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return; // dados: sempre rede
  if (url.origin === self.location.origin) {
    // rede primeiro (pega versão nova), cache como reserva
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
  } else if (/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/.test(url.hostname)) {
    // bibliotecas: abre do cache e atualiza por trás
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
