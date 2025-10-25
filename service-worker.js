const CACHE_NAME = 'smartschool-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/src/main.js',
  '/src/api.js',
  '/src/router.js',
  '/src/services/gemini.js',
  '/src/state.js',
  '/src/ui/dom-utils.js',
  '/src/ui/views/login.js',
  '/src/ui/views/parent-portal.js',
  '/src/ui/views/student-portal.js',
  '/src/ui/views/teacher-shell.js',
  '/src/utils.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
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
        return fetch(event.request);
      }
    )
  );
});
