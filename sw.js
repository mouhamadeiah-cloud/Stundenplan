const CACHE_NAME = 'primel-stundenplan-v1';
const urlsToCache = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './script.js',
  './storage.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});