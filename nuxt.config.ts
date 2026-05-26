import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },

  modules: ['@pinia/nuxt'],

  css: ['~/assets/styles/main.css'],

  nitro: {
    // node:sqlite is a Node 24 built-in — no bundling config needed.
    // Rollup/Nitro auto-externalises all node: protocol imports.
  },

  runtimeConfig: {
    // Override with DB_PATH env var in Docker / production
    dbPath: './data/leaderboard.db',
  },

  app: {
    head: {
      title: 'Meridian — A Geographical Pastime',
      meta: [
        { name: 'description', content: 'A geographical guessing game of flags, pins, and maps.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap',
        },
      ],
    },
  },
})
