/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["leaflet", "react-leaflet"],
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  images: {
    remotePatterns: [],
  },
  // www.hondius-watch.com → hondius-watch.com (301)
  // Это закрывает GSC "Duplicate without user-selected canonical" в случае когда
  // обе версии возвращают одинаковый контент. Канонические <link rel="canonical">
  // также проставлены на каждой странице через metadata.alternates.canonical.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.hondius-watch.com" }],
        destination: "https://hondius-watch.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Cloudflare edge cache 60s для дайнамических страниц с merged data.
      // Origin re-render на каждый запрос, но CDN absorbs нагрузку.
      // Пути перечислены явно чтобы не задеть /admin, /api/* и т.п.
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
      {
        source: "/outbreak/:slug",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
      {
        source: "/outbreak/:slug/timeline",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
      {
        source: "/outbreak/:slug/cases",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=120" },
        ],
      },
    ];
  },
};

export default nextConfig;
