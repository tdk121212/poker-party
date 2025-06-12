// service-worker.js

// با هر بار آپدیت، این شماره را یک واحد افزایش دهید.
const CACHE_NAME = 'poker-app-v14'; // <--- مثلاً نسخه بعدی v11 خواهد بود

const PRECACHE_URLS = [
  '/poker-party/',
  '/poker-party/index.html',
  '/poker-party/player_transactions.html',
  '/poker-party/manifest.json',
  '/poker-party/icons/icon-192x192.png',
  '/poker-party/icons/icon-512x512.png',
  '/poker-party/fonts/Vazirmatn-Regular.ttf',
  '/poker-party/fonts/Vazirmatn-Bold.ttf',
  '/poker-party/offline.html'
];

// --- رویداد نصب (Install) ---
// فایل‌های اصلی را کش می‌کند اما منتظر می‌ماند (waiting state).
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[Service Worker] Caching app shell: ${PRECACHE_URLS.length} files`);
        return cache.addAll(PRECACHE_URLS);
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache app shell during install:', error);
      })
  );
});

// --- رویداد فعال‌سازی (Activate) ---
// کش‌های قدیمی را پاک می‌کند.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating new service worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// --- رویداد Fetch ---
// منابع را از کش یا شبکه تحویل می‌دهد. این بخش از کد شما عالی بود و دست‌نخورده باقی می‌ماند.
self.addEventListener('fetch', event => {
  // فقط درخواست‌های GET را مدیریت می‌کنیم.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // اگر پاسخ در کش بود، آن را برگردان.
        if (response) {
          return response;
        }

        // اگر در کش نبود، از شبکه درخواست کن.
        return fetch(event.request).then(networkResponse => {
          // پاسخ معتبر شبکه را در کش ذخیره کن.
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      }).catch(() => {
        // اگر هم کش و هم شبکه شکست خوردند، صفحه آفلاین را نشان بده.
        if (event.request.mode === 'navigate') {
          return caches.match('/poker-party/offline.html');
        }
      });
    })
  );
});


// --- رویداد پیام (Message) ---
// این بخش حیاتی است! به پیام از طرف کلاینت گوش می‌دهد.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting message received. Activating immediately.');
    self.skipWaiting().then(() => {
        // پس از فعال‌سازی، کنترل کلاینت‌ها را به دست بگیر و به آن‌ها پیام بده که رفرش کنند.
        // این بخش اختیاری است چون کد کلاینت شما خودش رفرش می‌کند.
        self.clients.claim();
    });
  }
});
