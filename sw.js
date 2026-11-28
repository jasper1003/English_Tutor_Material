const CACHE_VERSION = "20261128b";
const STATIC_CACHE_NAME = `studio-static-${CACHE_VERSION}`;
const SHELL_CACHE_NAME = `studio-shell-${CACHE_VERSION}`;
const MAX_STATIC_CACHE_ENTRIES = 260;

const BYPASS_HOST_PATTERNS = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "www.googleapis.com",
  "docs.google.com",
  "youtube.com",
  "youtube-nocookie.com",
  "i.ytimg.com",
  "generativelanguage.googleapis.com"
];

const IMMUTABLE_CDN_PREFIXES = [
  "https://cdn.jsdelivr.net/npm/three@0.170.0/",
  "https://www.gstatic.com/firebasejs/11.6.0/"
];

const MUTABLE_MANIFEST_PATHS = new Set([
  "/data/curriculum/index.json",
  "/data/config/app-config.json",
  "/data/ielts/index.json"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  const activeCaches = new Set([STATIC_CACHE_NAME, SHELL_CACHE_NAME]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("studio-") && !activeCaches.has(key))
          .map((staleKey) => caches.delete(staleKey))
      ))
      .then(() => self.clients.claim())
  );
});

async function trimStaticCacheIfNeeded(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= MAX_STATIC_CACHE_ENTRIES) return;
    const excess = keys.length - MAX_STATIC_CACHE_ENTRIES;
    await Promise.all(keys.slice(0, excess).map((req) => cache.delete(req)));
  } catch {
    // Ignore quota / eviction cleanup issues
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok && (response.type === "basic" || response.type === "cors")) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && (response.type === "basic" || response.type === "cors")) {
    await cache.put(request, response.clone()).catch(() => {});
    trimStaticCacheIfNeeded(cache);
  }
  return response;
}

function isCacheFirstCandidate(url, request) {
  if (IMMUTABLE_CDN_PREFIXES.some((prefix) => url.href.startsWith(prefix))) {
    return true;
  }
  if (url.origin !== self.location.origin) {
    return false;
  }
  const path = url.pathname;
  // Normalize GitHub Pages project subpath cleanly by checking folder markers
  if (
    path.includes("/data/curriculum/units/")
    || (path.includes("/data/ielts/") && !path.endsWith("/index.json"))
    || path.includes("/images/")
    || path.includes("/assets/shop/")
  ) {
    return true;
  }
  if (url.searchParams.has("v") && (path.endsWith(".js") || path.endsWith(".css"))) {
    return true;
  }
  return request.destination === "image" && path.includes("/assets/");
}

function isMutableManifest(url) {
  if (url.origin !== self.location.origin) return false;
  for (const suffix of MUTABLE_MANIFEST_PATHS) {
    if (url.pathname.endsWith(suffix)) return true;
  }
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.headers.has("range") || request.destination === "audio" || request.destination === "video") {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (BYPASS_HOST_PATTERNS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    return;
  }
  // Never serve or cache sw.js from itself
  if (url.origin === self.location.origin && url.pathname.endsWith("/sw.js")) {
    return;
  }

  if (request.mode === "navigate" || isMutableManifest(url)) {
    event.respondWith(networkFirst(request, SHELL_CACHE_NAME));
    return;
  }

  if (isCacheFirstCandidate(url, request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  }
});
