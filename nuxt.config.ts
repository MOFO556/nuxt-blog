import { fileURLToPath } from "node:url";
import { resolve } from "path";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  css: ['~/assets/css/main.css','~/assets/css/main.scss'],
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4
  },
  alias: {
    '#components': fileURLToPath(new URL('../app/components', import.meta.url)),
    '#components/*': fileURLToPath(new URL('../app/components/*', import.meta.url)),
  },
  auth: {
    webAuth: true
  },
  hub: {
    blob: {
      driver: 'fs',
      dir: '.data/files'
    }
  },  
  icon: {
    clientBundle: {
      scan: true,
    },
    serverBundle: false,
  },
  image: {
    ipx: {
      fs: {        
        dir: resolve(process.cwd(), '.data/files')
      },
    },
    providers: {
      nuxtHubBlobIpx: {
        name: 'nuxtHubBlobIpx',
        provider: '#server/providers/nuxtHubBlobIpx.ts',
      },
      none: {
        name: 'none',
        provider: 'none',
      },
    },
    provider: 'nuxtHubBlobIpx',    
  },
  nitro: {
    experimental: { tasks: true, websocket: true },
    scheduledTasks: {
      '*/10 * * * *': ['posts:enrich', 'cleanup:orphan-images'],
    }
  },
  modules: [
    '@nuxthub/core',
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/hints',
    '@pinia/nuxt',
    '@nuxt/image', 
    "nuxt-auth-utils",
  ],
  runtimeConfig: {
    public: {
      dbFile: process.env.NUXT_DB_FILE || './.data/db/stash.db',
      API_URL: 'http://localhost:5000'
    },
    webauthn: {
      rpID: 'localhost',
      rpName: 'Your App Name',
      origin: 'http://localhost:3000',
    },
  },
  routeRules: {
    '/office/**': {
      ssr: false
    },
    '/auth/**': {
      ssr: false
    }
  },
  ui: {
    experimental: {
      componentDetection: true,
    },
  },
  /* routeRules: {
    '/posts/**': {
      ssr: false
    }
  } */
  // pages: false
})