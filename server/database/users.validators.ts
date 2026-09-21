import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './schema';

export const userInsertSchema = createInsertSchema(users, {
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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