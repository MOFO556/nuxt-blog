import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export default defineTask({
  meta: {
    name: 'db:migrate',
    description: 'Apply pending Drizzle migrations',
  },
  run() {
    try{
      migrate(useDb(), { migrationsFolder: './server/database/migrations' });
    }
    catch (err) {
      console.error('Migration failed with error:');
      console.error(err);
    }
    finally {
      return { result: 'migrated' as const };
    }
  },
});