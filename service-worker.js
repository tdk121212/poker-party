// service-worker.js
const CACHE_NAME = 'poker-app-v6'; // نام کش را به‌روز کنید تا کش‌های قبلی پاک شوند
const PRECACHE_URLS = [
  '/poker-party/', // ریشه برنامه، به index.html نگاشت می‌شود
  '/poker-party/index.html',
  '/poker-party/player_transactions.html',
  '/poker-party/manifest.json',
  '/poker-party/icons/icon-192x192.png',
  '/poker-party/icons/icon-512x512.png',
  '/poker-party/fonts/Vazirmatn-Regular.ttf',
  '/poker-party/fonts/Vazirmatn-Bold.ttf',
  // یک صفحه آفلاین ساده اضافه کنید (اختیاری اما توصیه می‌شود)
  '/poker-party/offline.html' 
];

// این تابع برای تمیز کردن URL از پارامترهای هش و کوئری برای مقاصد کش کردن استفاده می‌شود.
const cleanUrl = (url) => {
  const urlObj = new URL(url);
  urlObj.search = ''; // حذف پارامترهای کوئری
  urlObj.hash = '';   // حذف هش
  return urlObj.toString();
};

self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[Service Worker] Caching app shell: ${PRECACHE_URLS.length} files`);
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        // فعال‌سازی فوری سرویس ورکر جدید
        return self.skipWaiting(); 
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
          // حذف کش‌های قدیمی که در لیست سفید نیستند
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      // کنترل فوری کلاینت‌ها (صفحات باز مرورگر)
      return self.clients.claim(); 
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
  // این استراتژی: ابتدا کش، سپس شبکه. در صورت شکست هر دو، صفحه آفلاین را نمایش می‌دهد.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(cleanUrl(request.url)) // از cleanUrl برای تطبیق دقیق‌تر استفاده کنید
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[Service Worker] Serving from cache (navigation):', requestUrl.pathname);
            return cachedResponse;
          }
          console.log('[Service Worker] Fetching from network (navigation):', request.url);
          return fetch(request)
            .then(networkResponse => {
              // اگر پاسخ معتبر بود، آن را برای استفاده‌های بعدی کش کن
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(cleanUrl(request.url), responseToCache);
                });
              }
              return networkResponse;
            })
            .catch(() => {
              console.log('[Service Worker] Network request failed for navigation, serving offline page:', requestUrl.pathname);
              // در صورت عدم دسترسی به شبکه، صفحه آفلاین را برگردان
              return caches.match('/poker-party/offline.html'); 
            });
        })
    );
    return;
  }

  // استراتژی Cache First, then Network برای سایر منابع (CSS, JS, تصاویر، فونت‌ها)
  // این استراتژی: ابتدا کش را بررسی می‌کند. اگر پیدا شد، آن را برمی‌گرداند.
  // اگر پیدا نشد، از شبکه درخواست می‌دهد. اگر از شبکه هم موفق نشد، هیچ فال‌بکی ندارد
  // (می‌توانید برای تصاویر یک placeholder برگردانید).
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', request.url);
          return cachedResponse;
        }
        console.log('[Service Worker] Fetching from network:', request.url);
        return fetch(request).then(networkResponse => {
          // اگر پاسخ معتبر بود، آن را برای استفاده‌های بعدی کش کن
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
          console.error('[Service Worker] Fetch error for non-navigation request:', error, request.url);
          // در صورت بروز خطا برای منابع غیر HTML، می‌توانید یک پاسخ جایگزین ارائه دهید
          // مثلاً برای تصاویر می‌توانید یک تصویر placeholder برگردانید
          // if (request.destination === 'image') {
          //   return caches.match('/poker-party/placeholder-image.png');
          // }
          // برای سایر منابع، ممکن است مرورگر خطا بدهد یا خالی بماند
          throw error; // خطا را دوباره پرتاب کنید تا مرورگر آن را مدیریت کند
        });
      })
  );
});
