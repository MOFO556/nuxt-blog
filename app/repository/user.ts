import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type { ItemUploadMeta } from '~/types/core';
import type { UserResp } from "~/types/user";

export function createUserRepository(appFetch: typeof $fetch) {
  const userStore = useUserStore();
  return {
    async register(payload: { login: string, password: string, avatar?: ItemUploadMeta }): Promise<UserResp> {
      return appFetch<UserResp>('/auth/register', { 
            method: 'POST', 
            body: payload
          }
        ).then(res => {
          const userCookie = useCookie<(string| null)>
            ('token', { default: () => null });
          userCookie.value = res.token;
          userStore.setUser(res.user);
          return res;
        });
    },
    async login(payload: { login: string, password: string }): Promise<UserResp> {
      return appFetch<UserResp>('/auth/login', { 
            method: 'POST', 
            body: payload
          }
        ).then(res => {
          const userCookie = useCookie<(string| null)>
            ('token', { default: () => null });
          userCookie.value = res.token;
          userStore.setUser(res.user);
          return res;
        })
    },
    async registerPassKey(payload: { login: string, password?: string, avatar?: ItemUploadMeta }): Promise<UserResp> {
      const {attestation, attemptId, pending} = await appFetch<any>('/api/auth/webauthn/register', {
        method: 'POST',
        body: { ...payload, usePasskey: true },
      }).then(async options => {
        try {
          const { attemptId, pending, ...publicKey } = options;
          return {attestation: await startRegistration({ optionsJSON: publicKey }), attemptId, pending};
        }
        catch (err) {
          throw createError({ status: 400, statusText: "Failed to create a passkey", data: (<any>err)?.message || {} });
        }
      }).catch(err => {
          throw err;
      });

      return appFetch<UserResp>('/api/auth/webauthn/register/verify', {
        method: 'POST',
        body: { attemptId, pending, response: attestation },
      }).then(res => {
          const userCookie = useCookie<(string| null)>
            ('token', { default: () => null });
          userCookie.value = res.token;
          userStore.setUser(res.user);
          return res;
        });
    },
    async loginPassKey(payload: { login: string }) {
      const {assertion, attemptId} = await appFetch<any>('/api/auth/webauthn/login', {
        method: 'POST',
        body: { login: payload.login, usePassKey: true },
      }).then(async options => {
        try {
          const { attemptId, ...publicKey } = options;
          return {assertion: await startAuthentication({ optionsJSON: publicKey }), attemptId};
        }
        catch (err) {
          throw createError({ status: 422, statusText: "Failed to create a passkey", data: err });
        }
      }).catch(err => {
          throw createError({ status: 422, statusText: "Failed to create a passkey", data: err });
      });

      return appFetch<UserResp>('/api/auth/webauthn/login/verify', {
        method: 'POST',
        body: { attemptId, response: assertion },
      }).then(res => {
          const userCookie = useCookie<(string| null)>
            ('token', { default: () => null });
          userCookie.value = res.token;
          userStore.setUser(res.user);
          return res;
        })
    },
    async check(): Promise<UserResp & { auth?: boolean}> {
      return appFetch<UserResp & { auth?: boolean}>('/auth/check')
      .then(res => {
          if (res.auth) {
            userStore.setUser(res.user);
          }
          userStore.resolveInit();
          return res;
        })
    },
  }
}