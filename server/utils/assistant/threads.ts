import { and, asc, desc, eq } from 'drizzle-orm';
import { assistantMessages, assistantThreads } from '~~/server/database/schema';
import { useDb } from '#server-utils/db';
import { generateUUID } from '~~/shared/utils/generateUUID';

export function listThreadsForUser(userId: number) {
  return useDb()
    .select()
    .from(assistantThreads)
    .where(eq(assistantThreads.userId, userId))
    .orderBy(desc(assistantThreads.updatedAt))
    .all();
}

export function getThreadForUser(threadId: string, userId: number) {
  return useDb()
    .select()
    .from(assistantThreads)
    .where(and(
      eq(assistantThreads.id, threadId),
      eq(assistantThreads.userId, userId),
    ))
    .get();
}

export function createThread(userId: number, title = 'New chat') {
  const id = generateUUID();
  return useDb().insert(assistantThreads).values({
    id,
    userId,
    title,
  }).returning().get();
}

export function deleteThreadForUser(threadId: string, userId: number) {
  return useDb()
    .delete(assistantThreads)
    .where(and(
      eq(assistantThreads.id, threadId),
      eq(assistantThreads.userId, userId),
    ))
    .returning()
    .get();
}

export function listMessages(threadId: string) {
  return useDb()
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.threadId, threadId))
    .orderBy(asc(assistantMessages.createdAt))
    .all();
}

export function replaceThreadMessages(
  threadId: string,
  messages: { id: string; role: 'user' | 'assistant' | 'system'; parts: unknown }[],
) {
  const db = useDb();
  db.delete(assistantMessages).where(eq(assistantMessages.threadId, threadId)).run();
  if (!messages.length)
    return;

  db.insert(assistantMessages).values(
    messages.map(m => ({
      id: m.id || generateUUID(),
      threadId,
      role: m.role,
      partsJson: JSON.stringify(m.parts ?? []),
    })),
  ).run();

  db.update(assistantThreads)
    .set({ updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
    .where(eq(assistantThreads.id, threadId))
    .run();
}

export function touchThreadTitleFromUserMessage(threadId: string, text: string) {
  const title = text.trim().slice(0, 60) || 'New chat';
  useDb().update(assistantThreads)
    .set({
      title,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    })
    .where(eq(assistantThreads.id, threadId))
    .run();
}