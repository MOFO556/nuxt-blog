import { and, eq, lt, or } from "drizzle-orm";
import { sessions } from "~~/server/database/schema";

export default defineTask({
  meta: { name: 'cleanup:sessions', description: 'Remove expired and stale sessions' },
  async run() {
    const now = Date.now();
    const revokedGraceCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const invalidatedGraceCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const result = await useDb()
      .delete(sessions)
      .where(or(
        lt(sessions.expiresAt, now),
        and(
          eq(sessions.revoked, true),
          lt(sessions.lastSeenAt, revokedGraceCutoff),
        ),
        and(
          eq(sessions.invalidated, true),
          lt(sessions.lastSeenAt, invalidatedGraceCutoff),
        ),
      )).run();

    return { result: `Removed ${result.changes ?? 0} session(s)` };
  },
});