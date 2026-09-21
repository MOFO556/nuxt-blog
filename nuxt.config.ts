import { resolve } from "path";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  css: ['~/assets/css/main.css','~/assets/css/main.scss'],
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4
  },
  hub: {
    blob: {
      driver: 'fs',
      dir: '.data/files'
    }
  },
  image: {
    ipx: {
      fs: {        
        dir: resolve(process.cwd(), '.data/files')
      }
    },
    providers: {
      nuxtHubBlobIpx: {
        name: 'nuxtHubBlobIpx',
        provider: '#server/providers/nuxtHubBlobIpx.ts',
      },
    },
    provider: 'nuxtHubBlobIpx',
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      '*/10 * * * *': ['posts:enrich'],
    }
  },
  modules: [
    '@nuxthub/core',
    '@nuxt/ui',
    '@nuxt/fonts',
    '@pinia/nuxt',
    '@nuxt/image'
  ],
  runtimeConfig: {
    public: {
      dbFile: process.env.NUXT_DB_FILE || './.data/db/stash.db',
      API_URL: 'http://localhost:5000'
    }
  },
  routeRules: {
    '/office/**': {
      ssr: false
    },
    '/auth/**': {
      ssr: false
    }
  }
  /* routeRules: {
    '/posts/**': {
      ssr: false
    }
  } */
  // pages: false
})