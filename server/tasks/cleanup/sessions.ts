import { and, eq, lt, or } from "drizzle-orm";
import { sessions } from "~~/server/database/schema";

export default defineTask({
  meta: { name: 'cleanup:sessions', description: 'Remove expired and stale sessions' },
  async run() {
    const now = Date.now();
    const revokedGraceCutoff = now - 7 * 24 * 60 * 60 * 1000;
    const invalidatedGraceCutoff = now - 30 * 24 * 60 * 60 * 1000;

    const result = await useDb()
      .delete(sessions)
      .where(or(
        lt(sessions.expiresAt, now),
        and(
          eq(sessions.revoked, true),
          lt(sessions.createdAt, new Date(revokedGraceCutoff).toISOString()),
        ),
        and(
          eq(sessions.invalidated, true),
          lt(sessions.createdAt, new Date(invalidatedGraceCutoff).toISOString()),
        ),
      )).run();

    return { result: `Removed ${result.changes ?? 0} session(s)` };
  },
});