# Module catalog

Feature modules and shared seams. Paths are from the repo root.

## Auth & identity

**Purpose:** Register/login (password + passkey), session JWT, profile, passkey CRUD, session list/revoke.

| Layer | Key paths |
|-------|-----------|
| Pages | `app/pages/auth.vue`, `app/pages/auth/login.vue`, `app/pages/auth/register.vue` |
| Office UI | `app/components/office/credentials.vue`, `sessions.vue`, `profile-edit.vue`, `avatar-upload.vue` |
| Repository | `app/repository/user.ts` → `$api.auth` |
| Store | `app/stores/user.store.ts` |
| Middleware / plugins | `app/middleware/auth.global.ts`, `app/plugins/init-auth.ts`, `app/composables/useEnsureAuthChecked.ts` |
| API | `server/api/auth/**` (login, register, check, profile, sessions, webauthn/*) |
| Schema | `User`, `Credentials`, `Session`, `WebauthnAttempt` |
| Utils | `server/utils/auth.ts`, `session.ts`, `uaparser.ts`; `server/composable/useLookUpIp.ts`; `server/config/auth.ts`; `shared/auth.ts` |
| Client cookie | `app/utils/auth-cookie.ts`, `fetch-headers.ts` |

## Posts

**Purpose:** Public list/detail/filters; create/edit/delete for owners; "my posts" in office. Posts are **legacy** (plain text + bottom carousel) or **formatted** (TipTap JSON + sanitized HTML, inline images/carousels, separate cover).

| Layer | Key paths |
|-------|-----------|
| Pages | `app/pages/posts/index.vue`, `[id].vue`, `tag/[slug].vue`, `author/[login].vue`; office `app/pages/office/posts/**` |
| Components | `app/components/posts/*` (list, detail, form, editor, formatted-body, filters, tags, navigation, attachments); office list `app/components/office/posts.vue` (edit/delete actions) |
| Composables / utils | `usePostForm`, `usePostFormAssistantBridge`, `usePendingTipTapHtmlSync`; `app/utils/postFormAssistant.ts`, `postEditorContent.ts`, `postUploadIds.ts`, `postContentMode.ts` |
| Repository | `app/repository/posts.ts` → `$api.posts` |
| Store | `app/stores/posts.store.ts` (list cache + next/prev ids) |
| Composables | `useUserPostFetch` (owner middleware / office detail) |
| Middleware | `app/middleware/post-owner.ts` |
| API | `server/api/posts/*` |
| Schema / validators | `Post`, `PostAttachment`, `PostTag`; `posts.validators.ts` |
| Utils | `shared/utils/slugify.ts`, `sanitizePostHtml.ts`, `buildPostExcerpt.ts`, `rewriteContentImageIds.ts`, `parseFormattedBody.ts`, `collectContentImageIds.ts` |

Filtered entry points: `/posts/tag/:slug`, `/posts/author/:login` (also prerendered from DB in `nuxt.config.ts`).

## Comments

**Purpose:** Threaded comments on posts with optional image attachments; soft-delete; realtime broadcast to `post:{id}`.

| Layer | Key paths |
|-------|-----------|
| Components | `app/components/posts/comments.vue`, `comment-item.vue`, `app/components/comment-form.vue` |
| Repository | `app/repository/comments.ts` → `$api.comments` |
| Utils | `app/utils/comment-tree.ts` |
| Types | `app/types/comments.d.ts`, `comments.enum.ts` |
| API | `server/api/comments/[item]/[id].{get,post}.ts`, `[id].{put,delete}.ts` |
| Schema / validators | `Comment`, `CommentAttachment`; `comments.validators.ts` |

API currently allows only `item === 'post'` even though the schema supports comments on images.

## Images & media

**Purpose:** Upload images to posts/comments/avatar; store metadata; serve blobs; optional resize via `/_img`.

| Layer | Key paths |
|-------|-----------|
| Components | `app/components/images/view.vue`, `description.vue`; post/comment forms |
| Repository | `app/repository/images.ts` → `$api.images` |
| Helpers | `app/utils/urlToFile.ts` |
| API | `server/api/images/[item]/[id].{get,post}.ts`, `avatar.post.ts` |
| Routes | `server/routes/images/[...pathname].get.ts`, `_img/[...pathname].get.ts` |
| Provider | `server/providers/nuxtHubBlobIpx.ts` |
| Schema | `Image` (`uploaded_by`), attachment join tables |
| Utils | `server/utils/assertUserMayAttachPostImages.ts` (posts + comments) |
| Tasks | `cleanup:orphan-images` |

## Tags

**Purpose:** Tag posts; list all tags; popular tags for filters/prerender; daily unused-tag cleanup.

| Layer | Key paths |
|-------|-----------|
| Components | `app/components/posts/tags.vue`, `filters-drawer.vue` |
| Repository | `app/repository/tags.ts` → `$api.tags` |
| Pages | `app/pages/posts/tag/[slug].vue` |
| API | `server/api/tags/index.get.ts`, `popular.get.ts` |
| Schema | `Tag`, `PostTag` |
| Tasks | `cleanup:tags` |

## Assistant

**Purpose:** In-app AI guide (navigate/filter/find posts via hybrid RAG + structured tools) and post editor helper (live `search_web` for recent data, propose/confirm field patches + Unsplash staging). Nuxt UI Chat + Vercel AI SDK; OpenAI-compatible providers via env.

| Layer | Key paths |
|-------|-----------|
| UI | `app/components/assistant/*` (fab, panel, proposals); layouts mount fab/panel; docked panel on office create/edit |
| Store / composables | `app/stores/assistant.store.ts`, `useAssistantOverlay`, `useAssistantChat`, `useAssistantFormBridge`, `usePostFormAssistantBridge` (post form staging/patch bridge) |
| Repository | `app/repository/assistant.ts` → `$api.assistant` |
| API | `server/api/assistant/chat.post.ts`, `server/api/assistant/threads/*` |
| Schema | `AssistantThread`, `AssistantMessage`, `PostChunk` (+ sqlite-vec `post_chunk_vec`) |
| Utils | `server/utils/assistant/*` (provider, tools, webSearch, httpFetch, vectors, rate limit, threads, unsplash) |
| Shared | `shared/assistant/formPatch.ts`, `navigation.ts`, `generateUUID.ts` |
| Tasks | `assistant:reindex-posts` |
| Note | Floating non-blocking popup on browse; full-height docked panel on create/edit |

## Office / dashboard

**Purpose:** Authenticated shell for profile, passkeys, sessions, and the user’s posts.

| Layer | Key paths |
|-------|-----------|
| Layout / pages | `app/layouts/admin.vue`, `app/pages/office.vue`, `office/profile`, `office/posts/**` |
| Components | `app/components/office/*` |
| Composables | `useProfileEditForm`, `useNavigationItems` (nav for office + public) |
| Depends on | Auth, Posts, Images modules |

## Realtime

**Purpose:** Push comment/session/credential events to subscribed browser peers.

| Layer | Key paths |
|-------|-----------|
| Server | `server/utils/broadcast.ts`, `server/routes/_ws.ts` |
| Client | `app/composables/useRealTime.ts` → `useRealtime()` in comments, credentials, sessions |
| Producers | comment/image APIs, auth session/credential APIs |

## Admin & background jobs

| Piece | Path | Notes |
|-------|------|-------|
| Migrate plugin | `server/plugins/migrate.ts` | Runs `db:migrate` on boot |
| Runtime env mirror | `server/utils/mirror-runtime-env.mjs` via [`scripts/docker-entrypoint.sh`](../../scripts/docker-entrypoint.sh) | Copies every env name onto `NUXT_*` before Nitro import so `runtimeConfig` tracks env without an allow-list |
| Log redact plugin | `server/plugins/redact-auth-logs.ts` | On `/api/auth*` errors, clears req body and redacts auth headers |
| Tasks | `server/tasks/**` | See [relations-map.md](relations-map.md) |

## Shared client infrastructure

| Piece | Path | Role |
|-------|------|------|
| Fetch plugin | `app/plugins/fetch.ts` | `$appFetch`, `$api` |
| Forms | `app/composables/useForm.ts` | Shared form submit/error wiring |
| Async data | `useAsyncDataCatch.ts` | Error-tolerant `useAsyncData` wrapper |
| Auth init | `useEnsureAuthChecked.ts` | Deduped `$api.auth.check` |
| Alerts store | `alerts.store.ts` | Unused for now |
| Small utils | `debounce`, `throttle`, `prevent-bubbling`, `formatDateRelative` | Used in UI |

## Shared server infrastructure

| Piece | Path | Role |
|-------|------|------|
| DB accessor | `server/utils/db.ts` | Drizzle + schema |
| Body validation | `server/composable/useSafeReadValidateBody.ts` | Zod → 422 field pairs |
| Auth config | `server/config/auth.ts` | JWT secret / alg |
| Telemetry middleware | `server/__middleware/logger.ts` | Not under `server/middleware/` - deferred |

## Shared types / constants

| Piece | Path |
|-------|------|
| Session lifetimes | `shared/auth.ts` |
| Utility types | `shared/types/utils.d.ts` |
| App types | `app/types/*` |

## Public shell

| Piece | Path |
|-------|------|
| Root / home | `app/pages/index.vue`, `app/app.vue` |
| Default layout | `app/layouts/default.vue` |
| Error page | `app/error.vue` |
| Navigation | `useNavigationItems` in `app/composables/useNavigationItems.ts`|
