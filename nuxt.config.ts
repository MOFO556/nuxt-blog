import { fileURLToPath } from "node:url";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  css: ["~/assets/css/main.css","~/assets/css/main.scss"],
  devtools: { enabled: process.env.NODE_ENV === "development" },
  future: {
    compatibilityVersion: 4
  },
  experimental: {
    payloadExtraction: false,
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
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon-180x180.png" },
      ],
    }
  },
  auth: {
    webAuth: true
  },
  hooks: {
    async "prerender:routes"(ctx) {
      const dbFile =
        process.env.NUXT_DB_FILE || "./.data/db/stash.db";
        
      const { existsSync } = await import("node:fs");
      if (!existsSync(dbFile)) {
        console.warn(`[prerender] skipping popular tags — DB not found at ${dbFile}`);
        return;
      }

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
    // Local: filesystem under .data/files.
    // Production (Docker / Render): Cloudflare R2 via S3_*
    // Opt into R2 locally with NUXT_BLOB_DRIVER=s3..
    blob:
      process.env.NODE_ENV === "production" || process.env.NUXT_BLOB_DRIVER === "s3"
        ? {
            driver: "s3" as const,
            accessKeyId:
              process.env.S3_ACCESS_KEY_ID ||
              process.env.LITESTREAM_ACCESS_KEY_ID ||
              "",
            secretAccessKey:
              process.env.S3_SECRET_ACCESS_KEY ||
              process.env.LITESTREAM_SECRET_ACCESS_KEY ||
              "",
            bucket:
              process.env.S3_BUCKET || process.env.LITESTREAM_BUCKET || "",
            region: process.env.S3_REGION || "auto",
            endpoint:
              process.env.S3_ENDPOINT || process.env.LITESTREAM_ENDPOINT,
          }
        : { driver: "fs" as const, dir: ".data/files" },
  },
  icon: {
    clientBundle: {
      scan: true,
    },
    serverBundle: false,
  },
  image: {
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
      ignore: ["/_ipx/**", "/_img/**"],
      failOnError: false,
    },
    scheduledTasks: {
      "*/10 * * * *": ["posts:enrich", "cleanup:orphan-images", "cleanup:webauthn-attempts", "cleanup:sessions"],
      "0 4 * * *": ["cleanup:tags"],
    }
  },
  modules: [
    "@nuxthub/core",
    "@nuxt/ui",
    "@nuxt/fonts",
    "@nuxt/hints",
    "@nuxt/image", 
    "@nuxtjs/critters",
    "@pinia/nuxt",
    "@vite-pwa/nuxt",
    "nuxt-auth-utils",
  ],
  pwa: {
    disable: process.env.NODE_ENV !== "production",
    registerType: "autoUpdate",
    registerWebManifestInRouteRules: true,
    includeAssets: [
      "favicon.ico",
      "icons/apple-touch-icon-180x180.png",
      "icons/maskable-icon-512x512.png",
    ],
    manifest: {
      name: "MOFONuxt",
      short_name: "MOFOApp",
      description: "A PWA built with Vue 3",
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone",
      start_url: "/",
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
      ],
    },
    client: {
      installPrompt: false,
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      globIgnores: ["**/node_modules/**/*","sw.js","workbox-*.js","**/_nuxt/builds/**/*.json",],
      navigateFallback: "/",
      navigateFallbackDenylist: [
        /^\/api\//,
        /^\/_nuxt\//,
        /^\/_img\//,
        /^\/_ws/i,
        /^\/sw\.js$/i,
        /^\/workbox/i,
        /_payload\.json/i,
        /^\/manifest\.webmanifest$/i,
      ],
      runtimeCaching: [
        {
          urlPattern: /^\/_nuxt\/.*/,
          handler: "NetworkOnly",
        },
        {
          urlPattern: /\/_payload\.json/i,
          handler: "NetworkOnly",
        },
        {
          urlPattern: /^\/api\/.*/,
          handler: "NetworkOnly",
        },
      ],
    },
  },
  runtimeConfig: {
    dbFile: process.env.NUXT_DB_FILE || "./.data/db/stash.db",
    public: {
      API_URL: process.env.NUXT_PUBLIC_API_URL || "/api/",
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
        ...(process.env.NODE_ENV === "development" && {
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
})