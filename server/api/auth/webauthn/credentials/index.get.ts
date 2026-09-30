import { eq } from "drizzle-orm";
import { credentials } from "~~/server/database/schema";
import { formatUserAgent } from "~~/server/utils/uaparser";

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const rows = await useDb().query.credentials.findMany({
    where: eq(credentials.userId, userId),
    columns: { 
      id: true, 
      deviceType: true, 
      city: true, 
      country: true, 
      userAgent: true,
      backedUp: true,
      createdAt: true
    },
  });
  return rows.map(r => {
    if (r.userAgent)
      r.userAgent = formatUserAgent(r.userAgent);
    return r;
  });
});