import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { posts } from './schema';
import { PostMode, POST_MODE_VALUES } from '~~/shared/types/posts';

const urlLike = z
  .string()
  .trim()
  .max(255)
  .regex(
    /^((https?:\/\/)?(www\.)?[\w-]+(\.[\w-]+)+)(\/[^\s]*)?$/i,
    'Invalid URL',
  );
  
const tagInput = z.object({
  name: z.string().trim().min(1).max(50),
  slug: z.string().trim().min(1).max(50).optional(),
});

const postMode = z.enum(POST_MODE_VALUES);

const FORMATTED_CONTENT_MAX = 100_000;
const LEGACY_CONTENT_MIN = 25;
const LEGACY_CONTENT_MAX = 5000;

const refinePostContentByMode = (
  data: {
    mode?: PostMode;
    content: string;
    contentHtml?: string;
  },
  ctx: z.RefinementCtx,
) => {
  const mode = data.mode ?? PostMode.Legacy;
  if (mode === PostMode.Formatted) {
    if (!data.contentHtml?.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Content HTML is required',
        path: ['contentHtml'],
      });      
    else if (data.contentHtml.length > FORMATTED_CONTENT_MAX)
      ctx.addIssue({
        code: 'too_big',
        maximum: FORMATTED_CONTENT_MAX,
        origin: 'string',
        inclusive: true,
        message: `Too big: expected string to have <=${FORMATTED_CONTENT_MAX} characters`,
        path: ['contentHtml'],
      });
      
    if (data.content.length > FORMATTED_CONTENT_MAX)
      ctx.addIssue({
        code: 'too_big',
        maximum: FORMATTED_CONTENT_MAX,
        origin: 'string',
        inclusive: true,
        message: `Too big: expected string to have <=${FORMATTED_CONTENT_MAX} characters`,
        path: ['content'],
      });
      
    return;
  }

  if (data.content.length < LEGACY_CONTENT_MIN)
    ctx.addIssue({
      code: 'too_small',
      minimum: LEGACY_CONTENT_MIN,
      origin: 'string',
      inclusive: true,
      message: `Too small: expected string to have >=${LEGACY_CONTENT_MIN} characters`,
      path: ['content'],
    });
    
  if (data.content.length > LEGACY_CONTENT_MAX)
    ctx.addIssue({
      code: 'too_big',
      maximum: LEGACY_CONTENT_MAX,
      origin: 'string',
      inclusive: true,
      message: `Too big: expected string to have <=${LEGACY_CONTENT_MAX} characters`,
      path: ['content'],
    });
    
};

export const postInsertSchema = createInsertSchema(posts, {
  title: z.string().min(5).max(255),
  content: z.string().min(1),
})
  .pick({ url: true, title: true, content: true })
  .extend({
    url: urlLike.optional().or(z.literal('')),
    tags: z.array(tagInput).max(10).optional(),
    mode: postMode.default(PostMode.Legacy),
    contentHtml: z.string().max(FORMATTED_CONTENT_MAX).optional(),
    description: z.string().trim().max(300).optional(),
  })
  .superRefine(refinePostContentByMode);

export const postPatchSchema = createUpdateSchema(posts, {
  title: s => s.min(5).max(255),
  content: s => s.min(1),
})
  .pick({ title: true, content: true })
  .extend({
    url: urlLike.optional().or(z.literal('')),
    tags: z.array(tagInput).max(10).optional(),
    mode: postMode.optional(),
    contentHtml: z.string().max(FORMATTED_CONTENT_MAX).optional(),
    description: z.string().trim().max(300).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.content === undefined && data.contentHtml === undefined)
      return;

    const mode = data.mode;

    if (mode === PostMode.Legacy) {
      if (data.content !== undefined)
        refinePostContentByMode(
          { mode: PostMode.Legacy, content: data.content },
          ctx,
        );
      return;
    }

    if (mode === PostMode.Formatted) {
      if (data.contentHtml !== undefined) {
        if (!data.contentHtml.length)
          ctx.addIssue({
            code: 'custom',
            message: 'Content HTML is required',
            path: ['contentHtml'],
          });
        else if (data.contentHtml.length > FORMATTED_CONTENT_MAX)
          ctx.addIssue({
            code: 'too_big',
            maximum: FORMATTED_CONTENT_MAX,
            origin: 'string',
            inclusive: true,
            message: `Too big: expected string to have <=${FORMATTED_CONTENT_MAX} characters`,
            path: ['contentHtml'],
          });
      }
      if (data.content !== undefined && data.content.length > FORMATTED_CONTENT_MAX)
        ctx.addIssue({
          code: 'too_big',
          maximum: FORMATTED_CONTENT_MAX,
          origin: 'string',
          inclusive: true,
          message: `Too big: expected string to have <=${FORMATTED_CONTENT_MAX} characters`,
          path: ['content'],
        });
      return;
    }

    if (data.content !== undefined && data.contentHtml !== undefined) {
      refinePostContentByMode(
        { mode: PostMode.Formatted, content: data.content, contentHtml: data.contentHtml },
        ctx,
      );
      return;
    }
    if (data.content !== undefined)
      refinePostContentByMode(
        { mode: PostMode.Legacy, content: data.content },
        ctx,
      );
  });

export type postInput = z.infer<typeof postInsertSchema>;
export type postPatch = z.infer<typeof postPatchSchema>;