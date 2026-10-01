import { fileURLToPath } from "node:url";
import { resolve } from "path";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  css: ["~/assets/css/main.css","~/assets/css/main.scss"],
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  future: {
    compatibilityVersion: 4
  },
  alias: {
    "#components": fileURLToPath(new URL("../app/components", import.meta.url)),
    "#components/*": fileURLToPath(new URL("../app/components/*", import.meta.url)),
  },
  app: {
    head: {      
      title: "MOFONuxt",
      htmlAttrs: {
        lang: "en"
      },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    }
  },
  auth: {
    webAuth: true
  },
  hooks: {
    async 'prerender:routes'(ctx) {
      const dbFile =
        process.env.NUXT_DB_FILE || "./.data/db/stash.db";

      const { default: Database } = await import("better-sqlite3");

      const db = new Database(dbFile, {
        readonly: true,
        fileMustExist: true,
      });

      try {
        const tags = db
          .prepare(`
            SELECT t.slug AS slug
            FROM Tag t
            JOIN PostTag pt ON pt.tag_id = t.id
            GROUP BY t.id
            ORDER BY COUNT(pt.post_id) DESC, t.name ASC
            LIMIT 10
          `)
          .all() as { slug: string }[];

        const authors = db
          .prepare(`
            SELECT u.login AS login
            FROM User u
            JOIN Post p ON p.userId = u.id
            GROUP BY u.id
            ORDER BY COUNT(p.id) DESC, u.login ASC
          `)
          .all() as { login: string }[];

        for (const { slug } of tags) {
          ctx.routes.add(`/posts/tag/${encodeURIComponent(slug)}`);
        }

        for (const { login } of authors) {
          ctx.routes.add(`/posts/author/${encodeURIComponent(login)}`);
        }
      } finally {
        db.close();
      }
    },
  },
  hub: {
    blob: {
      driver: "fs",
      dir: ".data/files"
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
        dir: resolve(process.cwd(), ".data/files")
      },
    },
    providers: {
      nuxtHubBlobIpx: {
        name: "nuxtHubBlobIpx",
        provider: "#server/providers/nuxtHubBlobIpx.ts",
      },
      none: {
        name: "none",
        provider: "none",
      },
    },
    provider: "nuxtHubBlobIpx",    
  },
  nitro: {
    experimental: { tasks: true, websocket: true },
    prerender: {
      crawlLinks: true,
      ignore: ['/_ipx/**'],
      failOnError: false,
    },
    scheduledTasks: {
      "*/10 * * * *": ["posts:enrich", "cleanup:orphan-images", "cleanup:webauthn-attempts"],
      "0 4 * * *": ["cleanup:sessions", "cleanup:tags"],
    }
  },
  modules: [
    "@nuxthub/core",
    "@nuxt/ui",
    "@nuxt/fonts",
    "@nuxt/hints",
    "@nuxt/image", 
    '@nuxtjs/critters',
    "@pinia/nuxt",
    '@vite-pwa/nuxt',
    "nuxt-auth-utils",
  ],
  pwa: {
    devOptions: {
      enabled: true,
    },
    registerType: "autoUpdate",
    includeAssets: [
      "icons/favicon.ico",
      "icons/apple-touch-icon-180x180.png",
      "icons/maskable-icon-512x512.png",
    ],
    manifest: {
      name: "MOFO Nuxt",
      short_name: "MOFOApp",
      description: "A PWA built with Vue 3",
      theme_color: "#ffffff",
      display: "standalone",
      start_url: ".",
      icons: [
        {
          src: "icons/pwa-64x64.png",
          sizes: "64x64",
          type: "image/png",
        },
        {
          src: "icons/pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "icons/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "icons/maskable-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "icons/apple-touch-icon-180x180.png",
          sizes: "180x180",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js', '**/_nuxt/builds/**/*.json'],
      runtimeCaching: [
        {
          urlPattern: /^\/_nuxt\/.*/,
          handler: 'NetworkOnly',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      dbFile: process.env.NUXT_DB_FILE || "./.data/db/stash.db",
      API_URL:  process.env.NUXT_PUBLIC_API_URL || "http://localhost:5000"
    },
    webauthn: {
      rpID: process.env.NUXT_WEBAUTHN_RP_ID || "localhost",
      rpName: process.env.NUXT_WEBAUTHN_RP_NAME || "MOFONuxt",
      origin: process.env.NUXT_PUBLIC_APP_ORIGIN || "http://localhost:3000",
    },
  },
  routeRules: {
    "/office/**": {
      ssr: false
    },
    "/auth/**": {
      ssr: false
    },
    "/**": {
      headers: { "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload" },
    }
  },
  ui: {
    experimental: {
      componentDetection: true,
    },
  },
  vite: {
    server: {
      hmr: {
        ...(process.env.NODE_ENV === 'development' && {
          clientPort: (() => {
            const appOrigin = process.env.NUXT_PUBLIC_APP_ORIGIN
            if (appOrigin) {
              try {
                return Number(new URL(appOrigin).port) || 3000
              } catch (e) {}
            }
            return Number(process.env.PORT) || 3000
          })(),
        }),
      },
    },
  },
  /* routeRules: {
    "/posts/**": {
      ssr: false
    }
  } */
  // pages: false
})