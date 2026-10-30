import { tool } from 'ai';
import { and, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { posts, postTags, tags, users } from '~~/server/database/schema';
import { PostMode } from '~~/shared/types/posts';
import { resolveNavigationProposal } from '~~/shared/assistant/resolveNavigationProposal';
import { searchPostChunks } from '#server-utils/assistant/vectors';
import { searchUnsplashImages } from '#server-utils/assistant/unsplash';
import { searchWeb } from '#server-utils/assistant/webSearch';
import { useDb } from '#server-utils/db';

type AssistantToolFlags = {
  loggedIn: boolean;
  hasForm: boolean;
  limitImages?: boolean;
};

export function createAssistantTools(flags: AssistantToolFlags) {
  const searchPerPageMax = flags.limitImages ? 3 : 6;
  const searchPerPageDefault = flags.limitImages ? 3 : 4;
  const stageImagesMax = flags.limitImages ? 4 : 8;

  const guideTools = {
    get_current_time: tool({
      description: `Return the server's current date/time (UTC). 
        Call before search_web or list_posts when the task needs "today", "this week/month/year", "recent", or any relative date - never guess the calendar date from memory.`,
      inputSchema: z.object({}),
      execute: async () => {
        const now = new Date();
        return {
          iso: now.toISOString(),
          utcDate: now.toISOString().slice(0, 10),
          unixMs: now.getTime(),
          timeZone: 'UTC' as const,
        };
      },
    }),

    search_web: tool({
      description: `Search the live public web for current news, facts, and events. 
        Use when drafting post content or answering about recent happenings. 
        Do NOT use this to navigate the blog - use list_posts / search_posts_semantic / propose_navigation for in-app posts.`,
      inputSchema: z.object({
        query: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: async ({ query, limit }) => searchWeb(query, limit ?? 4, {
        compact: flags.limitImages === true,
      }),
    }),

    search_posts_semantic: tool({
      description: `Semantic search over THIS blog's indexed post chunks (RAG). 
        Use to find existing site content or avoid duplicating posts - not for live world news. Prefer limit≤20.`,
      inputSchema: z.object({
        query: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ query, limit }) => {
        const hits = await searchPostChunks(query, Math.min(limit ?? 6, 20));
        return {
          hits: hits.map(h => ({
            postId: h.postId,
            route: `/posts/${h.postId}`,
            distance: h.distance,
            snippet: h.content.slice(0, 400),
            metadata: h.metadata,
          })),
        };
      },
    }),

    list_posts: tool({
      description: 'List posts with structured filters (q, tags, author, dates). Prefer for exact filter requests. Prefer limit<=20 (larger values are capped).',
      inputSchema: z.object({
        q: z.string().max(80).optional(),
        tags: z.string().optional().describe('Comma-separated tag slugs'),
        author: z.string().max(50).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async (input) => {
        const db = useDb();
        const limit = Math.min(input.limit ?? 10, 20);
        const conditions = [];

        if (input.q) {
          const needle = `%${input.q.toLowerCase()}%`;
          conditions.push(or(
            sql`lower(${posts.title}) like ${needle}`,
            sql`lower(coalesce(${posts.description}, '')) like ${needle}`,
            sql`lower(coalesce(${posts.excerpt}, '')) like ${needle}`,
            and(eq(posts.mode, PostMode.Legacy), sql`lower(${posts.content}) like ${needle}`),
          ));
        }
        if (input.from)
          conditions.push(gte(posts.createdAt, `${input.from} 00:00:00`));
        if (input.to)
          conditions.push(lte(posts.createdAt, `${input.to} 23:59:59`));
        if (input.author) {
          const u = db.select({ id: users.id }).from(users)
            .where(sql`lower(${users.login}) = ${input.author.toLowerCase()}`)
            .get();
          conditions.push(u ? eq(posts.userId, u.id) : sql`0`);
        }
        if (input.tags) {
          const slugs = input.tags.split(',').map(s => s.trim()).filter(Boolean);
          if (slugs.length) {
            const ids = db.select({ id: tags.id }).from(tags).where(inArray(tags.slug, slugs)).all();
            if (ids.length) {
              const postIds = db.select({ id: postTags.postId }).from(postTags)
                .where(inArray(postTags.tagId, ids.map(t => t.id))).all();
              conditions.push(postIds.length ? inArray(posts.id, postIds.map(p => p.id)) : sql`0`);
            }
            else
              conditions.push(sql`0`);
          }
        }

        const where = conditions.length ? and(...conditions) : undefined;
        const rows = db.query.posts.findMany({
          where,
          columns: { id: true, title: true, excerpt: true, createdAt: true, mode: true },
          with: {
            user: { columns: { login: true } },
            postTags: { with: { tag: { columns: { slug: true, name: true } } } },
          },
          orderBy: (p, { desc: d }) => [d(p.createdAt)],
          limit,
        }).sync();

        return {
          posts: rows.map(r => ({
            id: r.id,
            title: r.title,
            excerpt: r.excerpt,
            mode: r.mode,
            author: r.user?.login,
            tags: r.postTags.map(pt => pt.tag.slug),
            route: `/posts/${r.id}`,
          })),
        };
      },
    }),

    get_post: tool({
      description: 'Fetch a single post by numeric id.',
      inputSchema: z.object({ id: z.number().int().positive() }),
      execute: async ({ id }) => {
        const row = useDb().query.posts.findFirst({
          where: eq(posts.id, id),
          columns: {
            id: true,
            title: true,
            description: true,
            excerpt: true,
            mode: true,
            content: true,
            contentHtml: true,
            createdAt: true,
            url: true,
          },
          with: {
            user: { columns: { login: true } },
            postTags: { with: { tag: { columns: { slug: true, name: true } } } },
          },
        }).sync();

        if (!row)
          return { error: 'Post not found' };

        const bodyPreview = row.mode === PostMode.Formatted
          ? (row.contentHtml ?? row.content).slice(0, 600)
          : row.content.slice(0, 600);

        return {
          id: row.id,
          title: row.title,
          description: row.description,
          excerpt: row.excerpt,
          mode: row.mode,
          author: row.user?.login,
          tags: row.postTags.map(pt => pt.tag.name),
          url: row.url,
          route: `/posts/${row.id}`,
          bodyPreview,
        };
      },
    }),

    list_tags: tool({
      description: 'List known tags (optionally filter by name/slug substring).',
      inputSchema: z.object({
        q: z.string().max(50).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ q, limit }) => {
        const db = useDb();
        const rows = q
          ? db.select().from(tags)
            .where(or(
              like(tags.name, `%${q}%`),
              like(tags.slug, `%${q}%`),
            ))
            .limit(limit ?? 30)
            .all()
          : db.select().from(tags).limit(limit ?? 30).all();
        return {
          tags: rows.map(t => ({ name: t.name, slug: t.slug })),
        };
      },
    }),

    propose_navigation: tool({
      description: `Propose an in-app navigation (path + optional query). User must Confirm in the UI. 
        Use for filters: tags/author/q/from/to without opening the filters drawer.`,
      inputSchema: z.object({
        path: z.string().min(1).max(200).optional(),
        queryEntries: z.array(z.object({
          key: z.string().min(1).max(40),
          value: z.string().max(200),
        })).max(12).optional(),
        tags: z.union([z.string(), z.array(z.string())]).optional(),
        author: z.string().optional(),
        q: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        reason: z.string().max(300).optional(),
      }),
      execute: async (input) => resolveNavigationProposal(input),
    }),
  };

  const editorTools = {
    propose_form_patch: tool({
      description: `Propose edits to the open post form fields. User must Accept. 
        Never change mode. For formatted posts prefer contentHtml; for legacy prefer content. 
        Limits (API 422 if exceeded): title 5-255 chars; description ≤300 chars; tags ≤10.`,
      inputSchema: z.object({
        title: z.string().min(5).max(255).optional(),
        description: z.string().max(300).optional()
          .describe('Short blurb / excerpt. Hard max 300 characters (not the article body).'),
        url: z.string().max(255).optional(),
        content: z.string().max(50000).optional(),
        contentHtml: z.string().max(100000).optional(),
        tags: z.array(z.string().max(40)).max(10).optional(),
        reason: z.string().max(300).optional(),
      }),

      execute: async (patch) => ({
        status: 'awaiting_user_confirm',
        patch: {
          title: patch.title,
          description: patch.description,
          url: patch.url,
          content: patch.content,
          contentHtml: patch.contentHtml,
          tags: patch.tags,
        },
        reason: patch.reason ?? null,
      }),
    }),

    search_images: tool({
      description: flags.limitImages
        ? `Unsplash search. perPage<=${searchPerPageMax}. Then ONE propose_stage_images (<=${stageImagesMax}). Map id to imageId, url to regularUrl.`
        : `Unsplash search. Prefer perPage ${searchPerPageDefault}. Then ONE propose_stage_images. Map id to imageId, url to regularUrl.`,
      inputSchema: z.object({
        query: z.string().min(1).max(80),
        perPage: z.number().int().min(1).max(searchPerPageMax).optional(),
      }),
      execute: async ({ query, perPage }) => {
        try {
          const limit = Math.min(perPage ?? searchPerPageDefault, searchPerPageMax);
          const images = await searchUnsplashImages(query, limit);
          const slim = images.slice(0, searchPerPageMax).map(img => ({
            id: img.id,
            url: img.regularUrl,
            alt: (img.alt ?? img.description ?? '').slice(0, flags.limitImages ? 48 : 80) || null,
          }));
          return {
            images: slim,
            n: slim.length,
            tip: slim.length
              ? `propose_stage_images once (<=${stageImagesMax}); short alt; forCarousel+slot`
              : 'no hits',
          };
        }
        catch (err) {
          return {
            images: [],
            n: 0,
            error: err instanceof Error ? err.message : 'Unsplash search failed',
          };
        }
      },
    }),

    propose_stage_image: tool({
      description: 'Stage one Unsplash image. Prefer propose_stage_images for batches. Pass alt for accessibility; set includeImageDescriptions=true only when the user asked for a visible saved description.',
      inputSchema: z.object({
        imageId: z.string().min(1),
        regularUrl: z.string().url(),
        alt: z.string().max(120).optional()
          .describe('Accessibility alt text (e.g. Unsplash alt). Always fine to set. Saved as visible description only when includeImageDescriptions=true.'),
        asCover: z.boolean().optional(),
        alsoInContent: z.boolean().optional()
          .describe('Insert at the top of the body. Default false. Only true when the user asked for the same photo in content/hero — not for a cover-only request.'),
        forCarousel: z.boolean().optional(),
        carouselSlot: z.string().min(1).max(64).optional()
          .describe('Must match data-carousel-slot in contentHtml for inline placement.'),
        includeImageDescriptions: z.boolean().optional()
          .describe('true only if the user asked for visible image descriptions under the photos. Default false - alt stays for a11y but is not saved as description.'),
      }),
      execute: async (input) => ({
        status: 'awaiting_user_confirm',
        includeImageDescriptions: input.includeImageDescriptions === true,
        image: {
          imageId: input.imageId,
          regularUrl: input.regularUrl,
          thumbUrl: input.regularUrl,
          alt: input.alt ?? null,
          photographer: null,
          downloadLocation: null,
          asCover: input.asCover ?? false,
          alsoInContent: input.alsoInContent ?? false,
          forCarousel: input.forCarousel ?? Boolean(input.carouselSlot),
          carouselSlot: input.carouselSlot ?? null,
        },
        reason: null,
      }),
    }),

    propose_stage_images: tool({
      description: `Stage <=${stageImagesMax} Unsplash images in one Accept. One gallery = same carouselSlot on every slide. Reuse cover: asCover+forCarousel on one slide. Short alt.`,
      inputSchema: z.object({
        images: z.array(z.object({
          imageId: z.string().min(1),
          regularUrl: z.string().url(),
          alt: z.string().max(80).optional()
            .describe('Accessibility alt (e.g. Unsplash). Always ok. Becomes saved description only when includeImageDescriptions=true.'),
          asCover: z.boolean().optional(),
          alsoInContent: z.boolean().optional()
            .describe('Body insert; only when the user asked for cover-in-content / hero. Default false.'),
          forCarousel: z.boolean().optional(),
          carouselSlot: z.string().min(1).max(48).optional(),
        })).min(1).max(stageImagesMax),
        includeImageDescriptions: z.boolean().optional()
          .describe('true only if the user asked for visible image descriptions. Default false - alt is kept for a11y only.'),
      }),
      execute: async (input) => ({
        status: 'awaiting_user_confirm',
        includeImageDescriptions: input.includeImageDescriptions === true,
        images: input.images.map(img => ({
          imageId: img.imageId,
          regularUrl: img.regularUrl,
          thumbUrl: img.regularUrl,
          alt: img.alt ?? null,
          asCover: img.asCover ?? false,
          alsoInContent: img.alsoInContent ?? false,
          forCarousel: img.forCarousel ?? Boolean(img.carouselSlot),
          carouselSlot: img.carouselSlot ?? null,
        })),
      }),
    }),
  };

  if (flags.loggedIn && flags.hasForm) {
    return {
      get_current_time: guideTools.get_current_time,
      search_web: guideTools.search_web,
      search_posts_semantic: guideTools.search_posts_semantic,
      ...editorTools,
    };
  }

  return guideTools;
}