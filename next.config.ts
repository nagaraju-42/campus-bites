import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Enable in production only (dev uses Turbopack which doesn't support SW)
  disable: process.env.NODE_ENV === "development",
  // Precache all app routes for instant offline navigation
  additionalPrecacheEntries: [
    { url: "/student/home", revision: null },
    { url: "/student/orders", revision: null },
    { url: "/student/cart", revision: null },
    { url: "/student/offers", revision: null },
    { url: "/student/profile", revision: null },
  ],
});

const nextConfig: NextConfig = {
  images: {
    // Cache optimized images for 1 year in browser
    minimumCacheTTL: 31536000,
    // Use WebP for better compression / speed
    formats: ["image/webp", "image/avif"],
    // Quality balance (good visuals, smaller file)
    deviceSizes: [390, 430, 640, 828],
    imageSizes: [64, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'i.postimg.cc' },
      { protocol: 'https', hostname: 'unpkg.com' },
    ],
  },

  async headers() {
    return [
      // ── Next.js optimized images – 1 year immutable cache ─────────────────
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Vary', value: 'Accept' },
        ],
      },
      // ── Static JS/CSS chunks – 1 year immutable (content-hashed filenames) ─
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // ── Public icons and images ────────────────────────────────────────────
      {
        source: '/icons/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // ── Manifest and SW ────────────────────────────────────────────────────
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          // SW must always be validated (no caching) so updates deploy immediately
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },

  turbopack: {},
};

export default withSerwist(nextConfig);
