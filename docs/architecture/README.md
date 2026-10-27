# Architecture

## What this project is

**MOFONuxt** is a Nuxt 4 blog with SQLite (Drizzle ORM). Files and the database can run on Cloudflare (NuxtHub blob / R2 + Litestream) or on local disk.

**Anyone** can read posts (including prerendered filtered paths by author and by popular tag). Posts may be **legacy** plain text with an image carousel, or **formatted** rich HTML (TipTap) with inline images and in-body carousels; list cards still use cover + tags.

**Signed-in users** can create and edit posts, comment (with optional images), upload images and descriptions, and use an office dashboard to edit profile, manage passkeys, and list/revoke sessions. Auth supports password and WebAuthn passkeys (or both).

UI: Tailwind CSS + Nuxt UI, mobile-first.

## Stack (short)

| Area | Choice |
|------|--------|
| App | Nuxt 4 (`app/` + `server/`) |
| DB | SQLite + Drizzle |
| Auth | JWT cookie/session + nuxt-auth-utils / SimpleWebAuthn |
| Media | NuxtHub blob + custom IPX-style provider |
| State | Pinia (data only; API via `$api` repositories) |
| Realtime | Nitro WebSocket + in-process broadcast |
| Tests | Vitest (unit / nuxt / e2e) |

## How to read these docs

| Doc | When to open it |
|-----|-----------------|
| [modules.md](modules.md) | “What exists and where does it live?” |
| [db-map.md](db-map.md) | Tables, FKs, Drizzle relations |
| [relations-map.md](relations-map.md) | Who calls whom across layers/modules |
| [MAINTENANCE.md](MAINTENANCE.md) | Checklist when adding or changing a feature |

## Service seams (no `services/` folder)

Treat these as the service boundaries:

1. **Client API** - `app/repository/*` exposed as `$api` from the fetch plugin  
2. **Server helpers** - `server/utils/*`, `server/composable/*`  
3. **Database** - `server/database/schema` + validators  
4. **Jobs** - `server/tasks/*`  
5. **Client state** - `app/stores/*` (no direct HTTP, except logout via `$api`)
