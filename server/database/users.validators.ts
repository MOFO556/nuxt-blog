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
    usePassKey: z.boolean().default(false),
  })
  .superRefine(({ password, usePassKey }, ctx) => {
    const hasPassword = !!password;
    if (!hasPassword && !usePassKey) {
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
  .transform(({ login, password, usePassKey, avatar }): InsertUser => {
    const hasPassword = !!password;
    const authMethod = hasPassword && usePassKey
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

export const userSchema = createSelectSchema(users, {  
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).pick({ login: true, password: true });

export const profilePatchSchema = z.object({
  avatar: z.number().int().positive().nullable().optional(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').optional(),
  currentPassword: z.string().optional(),
  removePassword: z.boolean().optional(),
});

export type userInput = z.infer<typeof userInsertSchema>;
export type ProfilePatchInput = z.infer<typeof profilePatchSchema>;
