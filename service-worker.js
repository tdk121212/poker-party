const CACHE_NAME = 'poker-app-v3'; // نام کش به‌روز شد (برای اطمینان از به‌روزرسانی)
const urlsToCache = [
  '/poker-party/',
  '/poker-party/index.html',
  '/poker-party/player_transactions.html',
  '/poker-party/manifest.json',
  '/poker-party/icons/icon-192x192.png',
  '/poker-party/icons/icon-512x512.png',
  // اضافه کردن فایل‌های فونت محلی با فرمت TTF به کش
  '/poker-party/fonts/Vazirmatn-Regular.ttf',
  '/poker-party/fonts/Vazirmatn-Bold.ttf'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching files:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache files during install:', error, urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(networkResponse) {
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            // اگر می‌خواهید منابع جدیدی که درخواست می‌شوند هم به کش اضافه شوند (اختیاری)
            // var responseToCache = networkResponse.clone();
            // caches.open(CACHE_NAME).then(cache => {
            //   cache.put(event.request, responseToCache);
            // });
            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetch failed for:', event.request.url, error);
            // در صورت تمایل، می‌توانید یک صفحه آفلاین پیش‌فرض را اینجا برگردانید
            // return caches.match('/poker-party/offline.html');
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
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
