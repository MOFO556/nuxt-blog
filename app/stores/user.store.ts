import { defineStore } from "pinia";
import type { User } from "~/types/user";

export const useUserStore = defineStore('UserStore', {
  state: (): { user: Partial<User> | null, inited: boolean } => ({
    user: null,
    inited: false
  }),
  getters: {
    loggedIn(this: any) {
      return !!this.user;
    }
  },
  actions: {
    logout() {
      useNuxtApp().$api.auth.revokeSession("current").then(() => {
        this.postRevokeCleanUp()   
      });
    },
    postRevokeCleanUp() {      
      const authCookie = useCookie('token');
      authCookie.value = null;
      location.reload();        
    },
    setUser(data: User) {
      if (data)
        this.user = { login: data.login, id: data.id, avatar: data.avatar };
    },
    clearUser() {
      this.user = null
    },
    resetInit() {
      this.inited = false;
    },
    resolveInit() {
      this.inited = true;
    }
  }
});
