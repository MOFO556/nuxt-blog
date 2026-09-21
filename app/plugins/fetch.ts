import { createCommentsRepository } from "~/repository/comments";
import { createImagesRepository } from "~/repository/images";
import { createPostsRepository } from "~/repository/posts";
import { createUserRepository } from "~/repository/user";

export default defineNuxtPlugin({
  name: 'fetch',
  parallel: true,
  async setup(){
    const config = useRuntimeConfig();
    const appFetch = $fetch.create({
      baseURL: config.public.API_URL,
      onRequest({ options }) {
        const headers = buildAppFetchHeaders();
        for (const [key, value] of Object.entries(headers)) {
          options.headers.append(key, value);
        }
      },
      async onResponseError({ response }) {
        
      }
    });

    const api = {
      auth: createUserRepository(appFetch),
      posts: createPostsRepository(appFetch),
      comments: createCommentsRepository(appFetch),
      images: createImagesRepository(appFetch)
    }
    
    return {
      provide: {
        appFetch,
        api
      }
    }
  }
});