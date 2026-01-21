const CACHE_NAME = 'daily-questmon-v2'; // Updated version to force cache refresh
const urlsToCache = [
    '/',
    '/manifest.json',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting()) // Force new SW to activate immediately
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all pages immediately
    );
});

// Fetch event - network-first for HTML, cache-first for other assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle http/https requests (skip chrome-extension, data:, etc.)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Network-First strategy for HTML files (including index.html)
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone the response and cache it
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(request);
                })
        );
        return;
    }

    // Cache-First strategy for static assets (JS, CSS, images)
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(request).then((response) => {
                    // Don't cache non-successful responses or non-GET requests
                    if (!response || response.status !== 200 || request.method !== 'GET') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                });
            })
    );
});
