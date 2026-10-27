# Testing guide

How this project is tested, how to run the suites, and how we use TDD day to day.

## Quick start

```bash
pnpm test:unit # Pure helpers, Zod validators (Node, fast)
pnpm test:nuxt # Stores, middleware, components, Nitro helpers
pnpm test:e2e # API + Playwright browser flows (slower)
pnpm test:ci # unit + nuxt - what Docker runs by default
pnpm test # All Vitest projects
pnpm test:watch # Watch mode
```

First time you need browser e2e:

```bash
node node_modules/playwright-core/cli.js install chromium
```

## Layout

```
test/
  unit/ # environment: node - no Nuxt runtime
  nuxt/ # environment: nuxt + happy-dom
  e2e/ # @nuxt/test-utils + Playwright / $fetch server
  helpers/ # temp SQLite, API mocks, fetch-error helpers
  fixtures/ # faker builders (user, post, …)
```

Import production code and helpers through aliases (not deep `../../..` paths):

| Alias | Points at |
|-------|-----------|
| `#app-utils` | `app/utils` |
| `#app-types` | `app/types` |
| `#server-utils` | `server/utils` |
| `#server-db` | `server/database` |
| `#server-composable` | `server/composable` |
| `#server-config` | `server/config` |
| `#test-helpers` | `test/helpers` |
| `#test-fixtures` | `test/fixtures` |
| `~/` `@/` | `app/` (Nuxt defaults) |

## What we test (seams)

Tests target **public behavior**, not private methods or Nuxt UI internals.

| Seam | Examples | Catches |
|------|----------|---------|
| Pure utils / validators | comment tree, slugify, Zod schemas, `validateBodyWithSchema` | Input rules, transforms |
| Client repositories | `createUserRepository` with mocked `$fetch` | URL/body contracts, cookie + store side effects |
| Pinia + middleware | `useUserStore`, `auth.global` | Session flags, redirects |
| Server API (temp SQLite) | register / login / sessions / posts / comments | Authz, CRUD, 422 `[['field','msg']]` masks |
| Components | login, sessions, credentials, confirm-dialog | Visible UI + `$api` / emit calls |
| Playwright e2e | guest→login, register→office | Real navigation and cookies |

**Mock only at system boundaries:** `$fetch` / `$api`, WebAuthn libraries, Hub blob, external IP lookup. Prefer a temp SQLite file over mocking Drizzle.

Expected values come from an independent source (literals, fixtures), not by recomputing the implementation in the assertion.

## Docker

Image builds run `pnpm test:ci` (unit + nuxt) **before** `pnpm build` by default.

```bash
# Normal app image (tests + build)
pnpm docker:app

# Build/run without tests
pnpm docker:app:skip-tests

# Or any docker build:
docker build --build-arg SKIP_TESTS=1 .
```

E2e is **not** part of the Docker build (browsers + long Nuxt boots). Run `pnpm test:e2e` locally or in a dedicated CI job.
