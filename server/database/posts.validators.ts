import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { posts } from './schema';

export const postInsertSchema = createInsertSchema(posts, {
  url: z.url().max(255),
  title: z.string().min(5).max(255),
  content: z.string().min(25).max(255),
}).pick({ url: true, title: true, content: true });

export const postPatchSchema = createUpdateSchema(posts,{
  url: z.url().max(255),
  title: s => s.min(5).max(255),
  content: s => s.min(25).max(255)
}).pick({ url: true, title: true, content: true });

export const postSchema = createSelectSchema(posts);

export type postInput = z.infer<typeof postInsertSchema>;
export type postPatch = z.infer<typeof postPatchSchema>;