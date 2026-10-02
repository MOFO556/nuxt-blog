import { createCommentsRepository } from "~/repository/comments";
import { createImagesRepository } from "~/repository/images";
import { createPostsRepository } from "~/repository/posts";
import { createTagsRepository } from "~/repository/tags";
import { createUserRepository } from "~/repository/user";
import { buildAppFetchHeaders } from "~/utils/fetch-headers";

export default defineNuxtPlugin({
  name: 'fetch',
  dependsOn: ['pinia'],
  async setup(){
    const config = useRuntimeConfig();
    const tokenCookie = useCookie<string | null>('token', { default: () => null });
    const appFetch = $fetch.create({
      baseURL: config.public.API_URL,
      onRequest({ options }) {
        const headers = buildAppFetchHeaders(tokenCookie.value);
        for (const [key, value] of Object.entries(headers)) {
          options.headers.set(key, value);
        }
      },
      async onResponseError({ response }) {
        
      }
    });

    const api = {
      auth: createUserRepository(appFetch),
      posts: createPostsRepository(appFetch),
      comments: createCommentsRepository(appFetch),
      images: createImagesRepository(appFetch),
      tags: createTagsRepository(appFetch)
    }
    
    return {
      provide: {
        appFetch,
        api
      }
    }
  }
});
