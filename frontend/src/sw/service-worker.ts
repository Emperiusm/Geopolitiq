/**
 * Service Worker for caching shell, static textures, PMTiles, and fonts.
 */
const CACHE_VERSION = 3;
const CACHE_NAME = `gambit-v${CACHE_VERSION}-cache`;
const PMTILES_CACHE = `gambit-v${CACHE_VERSION}-pmtiles`;
const FONT_CACHE = `gambit-v${CACHE_VERSION}-fonts`;
const START_URL = '/';

const STATIC_ASSETS = [
  START_URL,
  '/index.html',
  '/textures/earth-dark.jpg',
  '/textures/night-sky.png',
];

const ALL_CACHES = [CACHE_NAME, PMTILES_CACHE, FONT_CACHE];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => (self as any).skipWaiting())
  );
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !ALL_CACHES.includes(name))
          .map(name => caches.delete(name))
      );
    }).then(() => (self as any).clients.claim())
  );
});

/**
 * Check if a request is for PMTiles data (range requests to .pmtiles files).
 */
function isPMTilesRequest(url: URL): boolean {
  return url.pathname.endsWith('.pmtiles') || url.href.includes('.pmtiles');
}

/**
 * Check if a request is for Google Fonts resources.
 */
function isFontRequest(url: URL): boolean {
  return (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdn.protomaps.com' && url.pathname.includes('/fonts/')
  );
}

self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url);

  // ── Network-first for API calls ──────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // ── Cache PMTiles range requests ─────────────────────────
  // PMTiles uses HTTP Range requests for partial tile data.
  // We cache each unique range as a separate entry.
  if (isPMTilesRequest(url)) {
    event.respondWith(handlePMTilesRequest(event.request));
    return;
  }

  // ── Cache-first for font resources ───────────────────────
  if (isFontRequest(url)) {
    event.respondWith(handleFontRequest(event.request));
    return;
  }

  // ── Cache-first for static assets, cache dynamic on fetch ─
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchRes => {
        // Cache dynamic assets (js/css/images/textures)
        if (
          event.request.method === 'GET' &&
          (url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.css') ||
            url.pathname.includes('/textures/'))
        ) {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fetchRes;
      });
    })
  );
});

/**
 * Handle PMTiles range requests with caching.
 * Uses the full request URL + Range header as the cache key
 * so each byte-range slice is cached independently.
 */
async function handlePMTilesRequest(request: Request): Promise<Response> {
  const rangeHeader = request.headers.get('Range');

  // Build a cache key that includes the range so partial responses
  // don't collide with each other.
  const cacheKey = rangeHeader
    ? new Request(request.url + '?_range=' + encodeURIComponent(rangeHeader), {
        method: 'GET',
      })
    : request;

  const cache = await caches.open(PMTILES_CACHE);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    // Cache both 200 and 206 (Partial Content) responses
    if (
      networkResponse.ok ||
      networkResponse.status === 206
    ) {
      // Clone before caching — 206 responses are valid to cache
      // when keyed by their specific range.
      cache.put(cacheKey, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // If offline and no cache, return a 503
    return new Response('PMTiles data unavailable offline', { status: 503 });
  }
}

/**
 * Handle font requests with long-term caching (fonts rarely change).
 */
async function handleFontRequest(request: Request): Promise<Response> {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('Font unavailable offline', { status: 503 });
  }
}
