// service-worker.js
const CACHE_NAME = 'poker-app-v5'; // نام کش را مجدداً به‌روز کنید
const PRECACHE_URLS = [
  '/poker-party/', // ریشه برنامه، به index.html نگاشت می‌شود
  '/poker-party/index.html',
  '/poker-party/player_transactions.html',
  '/poker-party/manifest.json',
  '/poker-party/icons/icon-192x192.png',
  '/poker-party/icons/icon-512x512.png',
  '/poker-party/fonts/Vazirmatn-Regular.ttf',
  '/poker-party/fonts/Vazirmatn-Bold.ttf'
  // '/poker-party/offline.html' // <--- یک صفحه آفلاین ساده اضافه کنید (اختیاری اما توصیه می‌شود)
];

// این تابع برای تمیز کردن URL از پارامترهای هش و کوئری برای مقاصد کش کردن استفاده می‌شود.
const cleanUrl = (url) => {
  const urlObj = new URL(url);
  urlObj.search = ''; // حذف پارامترهای کوئری
  urlObj.hash = '';   // حذف هش
  return urlObj.toString();
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[Service Worker] Caching app shell: ${PRECACHE_URLS.length} files`);
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        return self.skipWaiting(); // فعال‌سازی فوری سرویس ورکر جدید
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache app shell during install:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating new service worker...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim(); // کنترل فوری کلاینت‌ها
    })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  // فقط درخواست‌های GET را مدیریت کن
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // استراتژی برای فایل‌های HTML اصلی (ناوبری)
  if (request.mode === 'navigate') {
    // برای player_transactions.html، همیشه نسخه بدون کوئری را از کش بگیر
    if (requestUrl.pathname === '/poker-party/player_transactions.html') {
      event.respondWith(
        caches.match('/poker-party/player_transactions.html')
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving from cache (navigation, specific HTML):', requestUrl.pathname);
              return cachedResponse;
            }
            return fetch(request)
              .catch(() => {
                console.log('[Service Worker] Network request failed for navigation (specific HTML):', requestUrl.pathname);
                // return caches.match('/poker-party/offline.html'); // Fallback
              });
          })
      );
      return;
    }
    // برای سایر ناوبری‌ها (مثل index.html یا ریشه)
    event.respondWith(
      caches.match(requestUrl.pathname === '/poker-party/' ? '/poker-party/index.html' : request.url)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving from cache (navigation):', requestUrl.pathname);
            return cachedResponse;
          }
          return fetch(request)
            .catch(() => {
              console.log('[Service Worker] Network request failed for navigation:', requestUrl.pathname);
              // return caches.match('/poker-party/offline.html'); // Fallback
            });
        })
    );
    return;
  }

  // استراتژی Cache First برای سایر منابع (CSS, JS, تصاویر، فونت‌ها)
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', request.url);
          return cachedResponse;
        }
        console.log('[Service Worker] Fetching from network:', request.url);
        return fetch(request).then(networkResponse => {
          // اگر پاسخ معتبر بود، آن را برای استفاده‌های بعدی کش کن (اختیاری)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            // const responseToCache = networkResponse.clone();
            // caches.open(CACHE_NAME).then(cache => {
            //   cache.put(request, responseToCache);
            // });
          }
          return networkResponse;
        });
      })
      .catch(error => {
        console.error('[Service Worker] Fetch error:', error, request.url);
        // در صورت بروز خطا، می‌توانید یک پاسخ جایگزین ارائه دهید
        // برای تصاویر، می‌توانید یک تصویر placeholder برگردانید
        // return caches.match('/poker-party/offline.html');
      })
  );
});
