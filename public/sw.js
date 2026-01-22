const CACHE_NAME = 'daily-questmon-v3'; // Increment version to force cache refresh
const urlsToCache = [
    '/',
    '/manifest.json',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching essential files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] Skip waiting to activate immediately');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            console.log('[SW] Found caches:', cacheNames);
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Taking control of all pages');
            return self.clients.claim();
        })
    );
});

// Fetch event - network-first strategy for all requests (better for development)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle http/https requests (skip chrome-extension, data:, etc.)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip caching for API requests (Supabase)
    if (url.hostname.includes('supabase')) {
        return; // Let browser handle directly, don't intercept
    }

    // Network-First strategy for all requests
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Only cache successful GET requests
                if (response.status === 200 && request.method === 'GET') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // If network fails, try cache as fallback
                console.log('[SW] Network failed, trying cache for:', request.url);
                return caches.match(request);
            })
    );
});
