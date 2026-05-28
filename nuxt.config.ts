import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  compatibilityDate: '2025-07-01',

  // All pages are client-side only — the server only handles /api/* routes.
  routeRules: {
    '/**': { ssr: false },
  },
  devtools: { enabled: false },

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],

  css: ['~/assets/styles/main.css'],

  nitro: {
    // node:sqlite is a Node 24 built-in — no bundling config needed.
    // Rollup/Nitro auto-externalises all node: protocol imports.
    serverAssets: [{ baseName: 'db_migrations', dir: './server/db/migrations' }],
  },

  runtimeConfig: {
    // Local SQLite fallback (used when NUXT_TURSO_URL is not set)
    dbPath: './data/leaderboard.db',
    // Turso — set these on Vercel (or any remote host) to use the remote DB.
    // NUXT_TURSO_URL=libsql://<db-name>.turso.io
    // NUXT_TURSO_AUTH_TOKEN=<token>
    tursoUrl:       '',
    tursoAuthToken: '',
  },

  app: {
    head: {
      title: 'Meridian — A Geographical Pastime',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, minimum-scale=1' },
        { name: 'description', content: 'A geographical guessing game of flags, pins, and maps.' },
        { name: 'theme-color', content: '#1e1c1a' },
        { name: 'apple-mobile-web-app-title', content: 'Meridian' },
      ],
      link: [
        // ── Favicons ──────────────────────────────────────────────────────
        { rel: 'icon', type: 'image/png', href: '/icons/favicon-96x96.png', sizes: '96x96' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icons/favicon.svg' },
        { rel: 'shortcut icon', href: '/icons/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
        // ── Fonts ─────────────────────────────────────────────────────────
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap',
        },
      ],
    },
  },

  // ── Progressive Web App ────────────────────────────────────────────────────
  pwa: {
    // Auto-replace the old SW without prompting the user.
    registerType: 'autoUpdate',

    manifest: {
      name: 'Meridian — A Geographical Pastime',
      short_name: 'Meridian',
      description: 'A geographical guessing game of flags, pins, and maps.',
      theme_color: '#1e1c1a',
      background_color: '#1e1c1a',
      display: 'standalone',
      orientation: 'portrait-primary',
      start_url: '/',
      icons: [
        // SVG icon — supported in Chrome / Edge / Firefox
        {
          src: 'icons/icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any',
        },
        // Maskable variant (adaptive icon on Android)
        {
          src: 'icons/icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'maskable',
        },
      ],
    },

    workbox: {
      // ── Precache ────────────────────────────────────────────────────────
      // JS/CSS bundles, data.json, HTML, fonts, AND all SVGs (flag images +
      // the app icon).  The 179 flag SVGs are small individually and must be
      // available offline so every quiz question can display its flag.
      globPatterns: ['**/*.{js,css,html,json,ico,png,svg,woff,woff2,ttf}'],
      cleanupOutdatedCaches: true,

      // Precache the app shell at "/" so navigateFallback can serve it for
      // any route the user has never visited.  All pages are ssr:false, so
      // the server always returns the same HTML shell regardless of URL.
      // The revision is the build timestamp, ensuring the SW re-fetches it
      // on every deploy.
      additionalManifestEntries: [
        { url: '/', revision: String(Date.now()) },
      ],

      // For any navigation request that isn't an API call or a Nuxt asset,
      // fall back to the precached "/" shell so offline navigation always
      // works — even for pages the user has never loaded before.
      navigateFallback: '/',
      navigateFallbackAllowlist: [/^(?!\/_nuxt\/|\/api\/|\/icons\/|\/favicon).*/],

      // ── Runtime caching strategies ───────────────────────────────────────
      runtimeCaching: [
        // Atlas data — NetworkFirst so a new deploy always serves fresh data
        // once the SW updates and the page reloads.  Falls back to cache only
        // when the device is genuinely offline.  Kept as a runtime rule because
        // @vite-pwa/nuxt sometimes scopes globPatterns to the Vite bundle
        // directory and misses static public/ files entirely.
        {
          urlPattern: /\/data\.json$/,
          handler: 'NetworkFirst' as const,
          options: {
            cacheName: 'atlas-data',
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 1,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days offline fallback
            },
            cacheableResponse: { statuses: [200] },
          },
        },

        // Google Fonts — stylesheet (small, changes rarely)
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'StaleWhileRevalidate' as const,
          options: {
            cacheName: 'google-fonts-stylesheets',
            expiration: {
              maxEntries: 4,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },

        // Google Fonts — actual font files (immutable, versioned URLs)
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst' as const,
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },

        // Leaderboard GET — offline fallback only.
        //
        // NetworkFirst with NO timeout: Workbox always waits for a real network
        // response and only falls back to the SW cache when the request actually
        // fails (i.e. the device is genuinely offline).  This is the critical
        // difference from the previous setup which used networkTimeoutSeconds:4
        // — that caused any slow API response to silently serve a stale cached
        // body to TanStack Query, which then treated it as fresh data.
        //
        // TanStack Query (staleTime:30s, refetchOnWindowFocus) owns all online
        // freshness decisions.  The SW cache is purely a last-resort fallback so
        // the leaderboard stays readable after a page reload while offline.
        {
          urlPattern: /\/api\/leaderboard(\?.*)?$/,
          handler: 'NetworkFirst' as const,
          options: {
            cacheName: 'leaderboard-api',
            // No networkTimeoutSeconds — never fall back to cache just because
            // the API is slow; only fall back on actual network failure.
            expiration: {
              maxEntries: 20,       // covers realistic filter combinations
              maxAgeSeconds: 60 * 5, // 5 min — just enough for a brief offline spell
            },
            cacheableResponse: { statuses: [200] },
          },
        },
      ],
    },

    // SW is disabled in dev so the browser always fetches fresh HTML from the
    // dev server.  With enabled:true the SW caches the first shell it sees and
    // serves that stale HTML on every reload, causing SSR hydration mismatches
    // as the JS changes but the cached HTML does not.
    // To test offline/PWA behaviour locally, flip this to true temporarily and
    // use DevTools → Application → Service Workers → Update / Unregister when done.
    devOptions: {
      enabled: false,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^(?!\/_nuxt\/|\/api\/|\/icons\/|\/favicon).*/],
      type: 'module',
    },
  },
})
