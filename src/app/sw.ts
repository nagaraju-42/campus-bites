/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // ── 1. Next.js optimized images – Cache First, 1 year ────────────────────
    {
      matcher: /^\/_next\/image\?/,
      handler: new CacheFirst({
        cacheName: "dnd-next-images",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 300,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },

    // ── 2. Remote shop/food images from Supabase, Cloudinary, Unsplash ───────
    {
      matcher: /^https:\/\/(.*\.supabase\.co|res\.cloudinary\.com|images\.unsplash\.com|i\.imgur\.com|i\.postimg\.cc|unpkg\.com)\/.*/,
      handler: new CacheFirst({
        cacheName: "dnd-remote-images",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },

    // ── 3. Next.js static assets (JS, CSS, fonts) – Cache First ──────────────
    {
      matcher: /^\/_next\/static\/.*/,
      handler: new CacheFirst({
        cacheName: "dnd-static-assets",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          }),
        ],
      }),
    },

    // ── 4. Google Fonts ───────────────────────────────────────────────────────
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
      handler: new CacheFirst({
        cacheName: "dnd-google-fonts",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },

    // ── 5. App icons / public assets ─────────────────────────────────────────
    {
      matcher: /\.(png|jpg|jpeg|webp|svg|ico|gif)$/,
      handler: new CacheFirst({
        cacheName: "dnd-public-images",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },

    // ── 6. Supabase API (shops, categories, menu) – Stale While Revalidate ───
    // Fresh data in background while serving cached version instantly
    {
      matcher: /^https:\/\/.*\.supabase\.co\/rest\/v1\/(approved_shops|app_categories|app_settings|promotions|menu_items|shop_reviews).*/,
      handler: new StaleWhileRevalidate({
        cacheName: "dnd-api-data",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 5, // 5 min stale, but always revalidates
          }),
        ],
      }),
    },

    // ── 7. App pages – Network First (fast fallback) ─────────────────────────
    {
      matcher: /^\/(student|shop|rider|admin)\/.*/,
      handler: new NetworkFirst({
        cacheName: "dnd-pages",
        networkTimeoutSeconds: 3, // fallback to cache after 3s
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24, // 1 day
          }),
        ],
      }),
    },

    // ── Fallback to defaultCache for everything else ──────────────────────────
    ...defaultCache,
  ],
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "DineNDeliver", {
        body: data.body || "You have a new update.",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        vibrate: [200, 100, 200, 100, 200],
        data: data.url ? { url: data.url } : { url: "/" },
        requireInteraction: true,
      } as any)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});

serwist.addEventListeners();
