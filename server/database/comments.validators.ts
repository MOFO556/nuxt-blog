import { z } from 'zod';

const imageRef = z.object({
  id: z.number().int().positive(),
});

export const commentInsertSchema = z.object({
  text: z.string().trim().max(5000).optional().default(''),
  parentId: z.number().int().positive().optional().nullable(),
  images: z.array(imageRef).optional(),
}).refine(
  ({ text, images }) => !!text || !!images?.length,
  { path: ['text'], message: 'Comment is empty: Enter text or attach image!' },
);

export const commentPatchSchema = z.object({
  text: z.string().trim().max(5000).optional().default(''),
  images: z.array(imageRef).optional(),
}).refine(
  ({ text, images }) => !!text || !!images?.length,
  { path: ['text'], message: 'Comment is empty: Enter text or attach image!' },
);

export type CommentInsertInput = z.infer<typeof commentInsertSchema>;
export type CommentPatchInput = z.infer<typeof commentPatchSchema>;