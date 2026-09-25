import type { UserResp } from "~/types/user";

export function createUserRepository(appFetch: typeof $fetch) {
  const userStore = useUserStore();
  return {
    async login(login: string, password: string) {
      return appFetch<UserResp>('/auth/login', { 
            method: 'POST', 
            body: { login: login, password: password }
          }
        ).then(res => {
          const userCookie = useCookie<(string| null)>
            ('token', { default: () => null });
          userCookie.value = res.token;
          userStore.setUser(res.user);
          return res;
        })
    },
    async check() {
      return appFetch<UserResp & { auth?: boolean}>('/auth/check')
      .then(res => {
          if (res.auth) {
            userStore.setUser(res.user);
          }
          userStore.resolveInit();
          return res;
        })
    }
  }
}