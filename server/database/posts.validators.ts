import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { posts } from './schema';

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

export const postInsertSchema = createInsertSchema(posts, {
  title:z.string().min(5).max(255),
  content: z.string().min(25).max(5000),
})
  .pick({ url: true, title: true, content: true })
  .extend({
      url:  urlLike.optional().or(z.literal('')),
      tags: z.array(tagInput).max(10).optional(),
    });

export const postPatchSchema = createUpdateSchema(posts, {
  title:   s => s.min(5).max(255),
  content: s => s.min(25).max(5000),
})
  .pick({ title: true, content: true })
  .extend({
    url:  urlLike.optional().or(z.literal('')),
    tags: z.array(tagInput).max(10).optional(),
  });

export type postInput = z.infer<typeof postInsertSchema>;
export type postPatch = z.infer<typeof postPatchSchema>;