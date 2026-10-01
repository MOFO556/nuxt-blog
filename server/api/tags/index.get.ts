import { tags } from "~~/server/database/schema";

export default defineEventHandler(async () => {
  return useDb().select(
    { id: tags.id, name: tags.name, slug: tags.slug }
  ).from(tags).orderBy(tags.name);
});