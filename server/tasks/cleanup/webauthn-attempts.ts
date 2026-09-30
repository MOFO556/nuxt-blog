import { lt } from 'drizzle-orm';
import { webauthnAttempts } from '~~/server/database/schema';

export default defineTask({
  meta: {
    name: 'cleanup:webauthn-attempts',
    description: 'Delete expired WebAuthn attempts (abandoned or interrupted ceremonies)',
  },
  async run() {
    const deleted = await useDb()
      .delete(webauthnAttempts)
      .where(lt(webauthnAttempts.expiresAt, Date.now()))
      .returning({ id: webauthnAttempts.id });

    return { result: { deleted: deleted.length } };
  },
});