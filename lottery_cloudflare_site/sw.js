/*
 * HTML+5画像を端末へ保存して、初回読み込み完了後のオフライン再利用を可能にする。
 * 本番の画像やHTMLを差し替えて再公開した際は、VERSIONを次の番号へ変更する。
 */
const VERSION = "lottery-cache-v1";
const RESOURCES = [
  "./",
  "./index.html",
  "./ooatari.png",
  "./atari.png",
  "./hazure.png",
  "./migi_ooatari.png",
  "./migi_atari.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(RESOURCES);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("lottery-cache-") && name !== VERSION)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // ネットワーク優先＋オフライン時キャッシュ。公開時の差し替えも反映しやすい。
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const response = await fetch(request);
      if (response.ok) {
        event.waitUntil(cache.put(request, response.clone()));
      }
      return response;
    } catch (err) {
      const saved = await cache.match(request, { ignoreSearch: true });
      if (saved) return saved;
      if (request.mode === "navigate") {
        const homepage = await cache.match("./index.html");
        if (homepage) return homepage;
      }
      return Response.error();
    }
  })());
});
