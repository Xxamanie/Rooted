


const CACHE_NAME = 'smartschool-v5'; // Bumped version to ensure new SW is installed
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  '/metadata.json',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/index.tsx',
  '/src/api.js',
  '/src/router.js',
  '/src/services/ai.js',
  '/src/services/gemini.js',
  '/src/services/openai.js',
  '/src/state.js',
  '/src/utils.js',
  '/src/ui/dom-utils.js',
  '/src/ui/views/login.js',
  '/src/ui/views/parent-portal.js',
  '/src/ui/views/student-portal.js',
  '/src/ui/views/teacher-shell.js',
  '/src/ui/views/teacher/admin.js',
  '/src/ui/views/teacher/analytics.js',
  '/src/ui/views/teacher/assessment.js',
  '/src/ui/views/teacher/classroom.js',
  '/src/ui/views/teacher/dashboard.js',
  '/src/ui/views/teacher/progress.js',
  '/src/ui/views/teacher/records.js',
  '/src/ui/views/teacher/reports.js',
  '/src/ui/views/teacher/results.js',
  '/src/ui/views/teacher/scheme.js',
  '/src/ui/views/teacher/teachers-desk.js',
  '/src/ui/views/teacher/results-panel.js',
  '/src/ui/views/teacher/timetable.js',
  '/src/ui/views/teacher/tuition.js',
  '/src/ui/views/teacher/lesson-plans.js',
  '/src/ui/views/teacher/creator.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use addAll with a request object that bypasses the cache on the first install
        const requests = urlsToCache.map(url => new Request(url, {cache: 'reload'}));
        return cache.addAll(requests);
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
        return fetch(event.request).then(
            (response) => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // IMPORTANT: Clone the response. A response is a stream
                // and because we want the browser to consume the response
                // as well as the cache consuming the response, we need
                // to clone it so we have two streams.
                var responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            }
        );
      }
    )
  );
});