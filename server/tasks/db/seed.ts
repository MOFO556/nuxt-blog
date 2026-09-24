import { faker } from '@faker-js/faker';
import { hash } from "bcrypt";
import { InsertPost, InsertUser, posts, users } from '~~/server/database/schema';

export default defineTask({
  meta: {
    name: 'db:seed',
    description: 'Seed users database'
  },
  async run() {
    try {
      const usersArr: InsertUser[] = [
        { login: "admin", password: await hash("password", 12)}
      ];
      const postsArr: InsertPost[] = [];

      for (let i = 0; i < 50; i++) {
        usersArr.push({
          login: faker.person.fullName(),
          password: await hash("password", 12) //faker.internet.password({ length: 10 })
        });
        for (let j = 0; j < 2; j++) {
          postsArr.push({
            title: faker.book.title(),
            url: faker.internet.url(),
            content: faker.lorem.words({ min: 10, max: 50}),
            userId: i + 2
          });
        }
      }

      const db = useDb();
      await db.insert(users).values(usersArr);
      await db.insert(posts).values(postsArr);

      return {
        result: 'success', 
        message: `${usersArr.length} users seeded; ${postsArr.length} posts added` 
      }
    } catch (err) {
      if (err instanceof Error) {
        return {
          error: err.message
        };
      } else {
        return {
          error: 'Unknown error'
        }
      }
    }
  }
})