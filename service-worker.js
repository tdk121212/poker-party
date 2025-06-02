// service-worker.js
// نام کش را به‌روز کنید تا کش‌های قبلی پاک شوند و تغییرات جدید اعمال شوند
// هر زمان که کدهای برنامه را تغییر می‌دهید و می‌خواهید کاربر نسخه جدید را دریافت کند، این مقدار را تغییر دهید.
const CACHE_NAME = 'poker-app-v7'; 

// لیست تمام فایل‌های ضروری برنامه که باید از قبل کش شوند
const PRECACHE_URLS = [
  '/poker-party/', // ریشه برنامه، به index.html نگاشت می‌شود
  '/poker-party/index.html',
  '/poker-party/player_transactions.html',
  '/poker-party/manifest.json',
  '/poker-party/icons/icon-192x192.png',
  '/poker-party/icons/icon-512x512.png',
  '/poker-party/fonts/Vazirmatn-Regular.ttf',
  '/poker-party/fonts/Vazirmatn-Bold.ttf',
  '/poker-party/offline.html' // صفحه آفلاین پیش‌فرض
];

// این تابع برای تمیز کردن URL از پارامترهای هش و کوئری برای مقاصد کش کردن استفاده می‌شود.
const cleanUrl = (url) => {
  const urlObj = new URL(url);
  urlObj.search = ''; // حذف پارامترهای کوئری
  urlObj.hash = '';   // حذف هش
  return urlObj.toString();
};

// رویداد 'install': هنگام نصب Service Worker اجرا می‌شود.
// در این مرحله، تمام فایل‌های ضروری برنامه را کش می‌کنیم.
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[Service Worker] Caching app shell: ${PRECACHE_URLS.length} files`);
        // اضافه کردن تمام URLهای پیش‌کش به کش
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        // فعال‌سازی فوری سرویس ورکر جدید پس از نصب موفق
        return self.skipWaiting(); 
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache app shell during install:', error);
      })
  );
});

// رویداد 'activate': هنگام فعال‌سازی Service Worker جدید اجرا می‌شود.
// در این مرحله، کش‌های قدیمی را پاک می‌کنیم تا فضای ذخیره‌سازی آزاد شود.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating new service worker...');
  const cacheWhitelist = [CACHE_NAME]; // لیست کش‌های مجاز (فقط کش فعلی)
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
      // کنترل فوری کلاینت‌ها (صفحات باز مرورگر) توسط Service Worker جدید
      return self.clients.claim(); 
    })
  );
});

// رویداد 'fetch': هر بار که مرورگر درخواستی برای منبعی می‌دهد، اجرا می‌شود.
// این رویداد قلب قابلیت آفلاین برنامه است.
self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  // فقط درخواست‌های GET را مدیریت کن (درخواست‌های POST و غیره به شبکه ارسال می‌شوند)
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // استراتژی "Cache First, then Network" برای تمام درخواست‌ها
  // این استراتژی:
  // 1. ابتدا سعی می‌کند منبع را از کش پیدا کند.
  // 2. اگر در کش بود، آن را برمی‌گرداند.
  // 3. اگر در کش نبود، از شبکه درخواست می‌دهد.
  // 4. اگر از شبکه هم موفق نشد (مثلاً آفلاین بود)، یک صفحه آفلاین را نمایش می‌دهد.
  event.respondWith(
    caches.match(request) // ابتدا سعی کن از کش پیدا کنی
      .then(cachedResponse => {
        // اگر در کش پیدا شد، آن را برگردان
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', request.url);
          return cachedResponse;
        }

        // اگر در کش نبود، از شبکه درخواست بده
        console.log('[Service Worker] Fetching from network:', request.url);
        return fetch(request)
          .then(networkResponse => {
            // اگر پاسخ معتبر بود (مثلاً 200 OK)، آن را در کش ذخیره کن
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse; // پاسخ شبکه را برگردان
          })
          .catch(error => {
            // اگر از شبکه هم موفق نشد (مثلاً خطای شبکه یا آفلاین بود)،
            // و درخواست برای یک صفحه HTML بود، صفحه آفلاین را برگردان.
            // برای منابع دیگر (مثل تصاویر یا JS)، می‌توانید فال‌بک خاصی داشته باشید
            // یا اجازه دهید مرورگر خطا را مدیریت کند.
            console.error('[Service Worker] Network request failed:', error, request.url);
            if (request.mode === 'navigate' || request.destination === 'document') {
              return caches.match('/poker-party/offline.html');
            }
            // برای سایر منابع، می‌توانید یک پاسخ پیش‌فرض (مثلاً تصویر placeholder) برگردانید
            // یا خطا را پرتاب کنید تا مرورگر آن را مدیریت کند.
            throw error; 
          });
      })
  );
});

// رویداد 'message': برای دریافت پیام از صفحات وب (کلاینت‌ها)
self.addEventListener('message', event => {
  // اگر پیامی برای skipWaiting دریافت شد، Service Worker را فوراً فعال کن
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

