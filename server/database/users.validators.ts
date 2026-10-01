import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { InsertUser, users } from './schema';

export const userColumns = createInsertSchema(users, {
  login: z.string().min(5).max(255),
  password: z.string().max(255).nullable().optional(),
}).omit({ id: true, avatar: true, authMethod: true, createdAt: true, updatedAt: true, });

const avatarSchema = z.object({
  fileId: z.number(),
  existingPath: z.string().optional(),
  originalName: z.string().optional(),
});

export const userInsertSchema = userColumns.extend({
    avatar: avatarSchema.optional(),
    usePasskey: z.boolean().default(false),
  })
  .superRefine(({ password, usePasskey }, ctx) => {
    const hasPassword = !!password;
    if (!hasPassword && !usePasskey) {
      ctx.addIssue({
        code: "custom",
        path: ['password'],
        message: 'Provide a password or enable passkey',
      });
    }
    if (hasPassword && password!.length < 6) {
      ctx.addIssue({
        code: "custom",
        path: ['password'],
        message: 'Password must be at least 6 characters',
      });
    }
  })
  .transform(({ login, password, usePasskey, avatar }): InsertUser => {
    const hasPassword = !!password;
    const authMethod = hasPassword && usePasskey
      ? 'both'
      : hasPassword
        ? 'password'
        : 'passkey';

    return {
      login,
      password: hasPassword ? password! : null,
      authMethod,
      avatar: avatar?.fileId
    };
  });

export const userPatchSchema = createUpdateSchema(users, {
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const userSchema = createSelectSchema(users, {  
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).pick({ login: true, password: true });

export type userInput = z.infer<typeof userInsertSchema>;
export type userPatch = z.infer<typeof userPatchSchema>;