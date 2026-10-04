import { and, asc, eq, gt } from "drizzle-orm";
import { sessions } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  const { session: current } = await requireAuth(event);
  
  const rows = await useDb().query.sessions.findMany({
    where: and(
      eq(sessions.userId, current.userId),
      eq(sessions.revoked, false),
      gt(sessions.expiresAt, Date.now()),
    ),
    columns: { id: true, loginMethod: true, city: true, country: true,
      userAgent: true, createdAt: true, lastSeenAt: true,
      invalidated: true, invalidReason: true 
    },
    orderBy: asc(sessions.lastSeenAt)
  });
  return rows
    .sort((a, b) => +new Date(b.lastSeenAt) - +new Date(a.lastSeenAt))
    .map(r => ({
      ...r,
      current: r.id === current.id,
      userAgent: r.userAgent ? formatUserAgent(r.userAgent) : null,
    }));
});