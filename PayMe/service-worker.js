// Имя кэша
const CACHE_NAME = 'payme-v1';
// Файлы для кэширования
const urlsToCache = [
  '/PayMe/',
  '/PayMe/index.html',
  '/PayMe/src/style.css',
  '/PayMe/src/main.js',
  '/PayMe/manifest.json',
  '/PayMe/icon-192.png',
  '/PayMe/icon-512.png'
];

// Установка сервис-воркера и кэширование файлов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэширование файлов приложения');
        return cache.addAll(urlsToCache);
      })
  );
});

// Обработка запросов (стратегия cache-first)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Возвращаем кэшированный ответ, если он есть
        if (response) {
          return response;
        }
        
        // Иначе делаем сетевой запрос
        return fetch(event.request).then(
          response => {
            // Проверяем валидность ответа
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Кэшируем ответ для будущих запросов
            var responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Активация сервис-воркера и очистка старых кэшей
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Удаление старого кэша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});