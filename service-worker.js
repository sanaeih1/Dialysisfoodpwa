const CACHE_NAME = 'my-site-cache-v1';
const OFFLINE_URL = '/offline.html'; // اضافه کردن صفحه آفلاین
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  OFFLINE_URL // کش کردن صفحه آفلاین
];

// نصب سرویس ورکر و کش کردن فایل‌ها
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('فایل‌های ضروری کش شدند.');
        return cache.addAll(urlsToCache);
      })
  );
});

// استراتژی "Cache Only" برای جلوگیری از ارتباط با سرور
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // اگر فایل در کش وجود داشت، بازگردانده می‌شود
        if (response) {
          return response;
        }
        // اگر فایل وجود نداشت، صفحه آفلاین نمایش داده می‌شود
        return caches.match(OFFLINE_URL);
      })
  );
});

// حذف کش‌های قدیمی در زمان فعال‌سازی
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});