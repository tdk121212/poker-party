// service-worker.js
const CACHE_NAME = 'poker-app-v4'; // نام کش را به‌روز کنید
const urlsToCache = [
  '/poker-party/',
  '/poker-party/index.html',
  '/poker-party/player_transactions.html', // این فایل پایه کش می‌شود
  '/poker-party/manifest.json',
  '/poker-party/icons/icon-192x192.png',
  '/poker-party/icons/icon-512x512.png',
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
  const requestUrl = new URL(event.request.url);

  // اگر درخواست برای player_transactions.html است، پارامترهای کوئری را نادیده بگیر
  // و فقط فایل پایه را از کش جستجو کن.
  if (requestUrl.pathname === '/poker-party/player_transactions.html') {
    event.respondWith(
      caches.match('/poker-party/player_transactions.html')
        .then(response => {
          return response || fetch(event.request);
        })
        .catch(error => {
          console.error('Fetch failed for player_transactions.html:', error);
          // Optionally, return a generic offline page if not found in cache and network fails
          // return caches.match('/poker-party/offline.html');
        })
    );
    return; // از ادامه اجرای کد fetch listener برای این درخواست جلوگیری کن
  }

  // برای سایر درخواست‌ها، از منطق قبلی استفاده کن
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(networkResponse) {
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              // برای منابعی مثل فونت‌های گوگل که نمی‌خواهیم به خاطر خطای آن‌ها کل صفحه خراب شود
              if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('gstatic.com')) {
                // console.warn('Network request for external font failed, but continuing:', event.request.url);
                return networkResponse; // حتی اگر خطا داشت، اجازه بده مرورگر خودش مدیریت کند
              }
              return networkResponse;
            }
            // Optional: Cache new requests dynamically (Cache then network strategy for non-pre-cached assets)
            // const responseToCache = networkResponse.clone();
            // caches.open(CACHE_NAME).then(cache => {
            //   cache.put(event.request, responseToCache);
            // });
            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetch failed for:', event.request.url, error);
            // return caches.match('/poker-party/offline.html'); // Generic offline page
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
