const CACHE_NAME = 'dialysis-app-cache-v1';
const urlsToCache = [
  '/Dialysisfoodpwa/',
  '/Dialysisfoodpwa/index.html',
  '/Dialysisfoodpwa/styles.css',
  '/Dialysisfoodpwa/scripts.js',
  '/Dialysisfoodpwa/foods.json',
  '/Dialysisfoodpwa/icon-192x192.png',
  '/Dialysisfoodpwa/icon-512x512.png',
  '/Dialysisfoodpwa/manifest.json',
  'https://cdn.jsdelivr.net/npm/vazir-font@28.0.0/dist/font-face.css',
  'https://cdn.jsdelivr.net/npm/shabnam-font@5.0.0/dist/font-face.css',
  'https://cdn.jsdelivr.net/npm/persian-date@1.1.0/dist/persian-date.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).catch(error => {
      console.error('Service Worker: Failed to cache resources', error);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response; // بازگشت از کش
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(error => {
        console.error('Service Worker: Fetch failed', error);
        if (event.request.url.includes('foods.json')) {
          return caches.match('/Dialysisfoodpwa/foods.json');
        }
        return caches.match('/Dialysisfoodpwa/index.html');
      });
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});