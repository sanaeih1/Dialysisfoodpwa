const CACHE_NAME = 'dialysis-app-cache-v1'; // نام کش حفظ شده است
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
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

// نصب سرویس‌ورکر و کش کردن فایل‌های اولیه
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // فعال‌سازی فوری سرویس‌ورکر جدید
      .catch(error => {
        console.error('Service Worker: Failed to cache resources', error);
      })
  );
});

// فعال‌سازی سرویس‌ورکر و پاک‌سازی کش‌های قدیمی
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // کنترل فوری کلاینت‌ها
      .catch(error => {
        console.error('Service Worker: Failed to clean up old caches', error);
      })
  );
});

// مدیریت درخواست‌ها (Fetch)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // اگر درخواست در کش موجود بود، از کش برگردان
        if (response) {
          return response;
        }
        // در غیر این صورت، از شبکه درخواست کن
        return fetch(event.request)
          .then(networkResponse => {
            // فقط پاسخ‌های معتبر (200) و نوع basic را کش کن
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Service Worker: Failed to cache response', error);
              });
            return networkResponse;
          })
          .catch(error => {
            console.error('Service Worker: Fetch failed', error);
            // در حالت آفلاین، برای فایل‌های حیاتی fallback ارائه کن
            if (event.request.url.includes('foods.json')) {
              return caches.match('/Dialysisfoodpwa/foods.json');
            }
            return caches.match('/Dialysisfoodpwa/index.html');
          });
      })
  );
});