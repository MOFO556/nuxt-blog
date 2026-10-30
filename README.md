# MOFONuxt

Nuxt 4 blog with SQLite (Drizzle), password + passkey auth, comments, image uploads, and an office dashboard for profile, sessions, and posts. Runs locally or with Cloudflare / Litestream-backed storage.

## Docs

- **Architecture** (modules, DB map, cross-service relations, review flags): [docs/architecture/](docs/architecture/)
- **Testing**: [docs/testing.md](docs/testing.md)

## Quick start

```bash
pnpm install
pnpm dev # http://localhost:3000
```

```bash
pnpm build # production / prerender build
pnpm test:ci # unit + nuxt (Docker default gate)
```

