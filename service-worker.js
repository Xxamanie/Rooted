const CACHE_NAME = 'smartschool-v2'; // Bumped version to ensure new SW is installed
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  '/src/main.js',
  '/src/api.js',
  '/src/router.js',
  '/src/services/gemini.js',
  '/src/state.js',
  '/src/utils.js',
  '/src/ui/dom-utils.js',
  '/src/ui/views/login.js',
  '/src/ui/views/parent-portal.js',
  '/src/ui/views/student-portal.js',
  '/src/ui/views/teacher-shell.js',
  '/src/ui/views/admin.js',
  '/src/ui/views/analytics.js',
  '/src/ui/views/assessment.js',
  '/src/ui/views/classroom.js',
  '/src/ui/views/dashboard.js',
  '/src/ui/views/progress.js',
  '/src/ui/views/records.js',
  '/src/ui/views/reports.js',
  '/src/ui/views/results.js',
  '/src/ui/views/scheme.js',
  '/src/ui/views/timetable.js',
  '/src/ui/views/tuition.js'
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

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
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