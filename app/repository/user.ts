import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type { ItemUploadMeta } from '~/types/core';
import type { UserResp, ProfileFormData, SessionsInfo } from "~/types/user";
import { useAuthTokenCookie } from '~/utils/auth-cookie';

export function createUserRepository(appFetch: typeof $fetch) {
  const userStore = useUserStore();
  const tokenCookie = useAuthTokenCookie();
  return {
    async register(payload: { login: string, password: string, avatar?: ItemUploadMeta }): Promise<UserResp> {
      return appFetch<UserResp>('/auth/register', { 
            method: 'POST', 
            body: payload
          }
        ).then(res => {
          tokenCookie.value = res.token;
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
          tokenCookie.value = res.token;
          userStore.setUser(res.user);
          return res;
        })
    },
    async registerPassKey(payload: { login: string, password?: string, avatar?: ItemUploadMeta }): Promise<UserResp> {
      const { attestation, attemptId } = await appFetch<any>('/api/auth/webauthn/register', {
        method: 'POST',
        body: { ...payload, usePasskey: true },
      }).then(async options => {
        try {
          const { attemptId, ...publicKey } = options;
          return { attestation: await startRegistration({ optionsJSON: publicKey }), attemptId };
        }
        catch (err) {
          throw createError({ status: 400, statusText: "Failed to create a passkey", data: (<any>err)?.message || {} });
        }
      }).catch(err => {
          throw err;
      });

      return appFetch<UserResp>('/api/auth/webauthn/register/verify', {
        method: 'POST',
        body: { attemptId, response: attestation },
      }).then(res => {
          tokenCookie.value = res.token;
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
          throw createError({ status: 422, statusText: "Failed to validate a passkey", data: err });
        }
      }).catch(err => {
          throw err;
      });

      return appFetch<UserResp>('/api/auth/webauthn/login/verify', {
        method: 'POST',
        body: { attemptId, response: assertion },
      }).then(res => {
          tokenCookie.value = res.token;
          userStore.setUser(res.user);
          return res;
        })
    },
    async addPasskey() {
      const { attestation, attemptId } = await appFetch<any>('/api/auth/webauthn/credentials', { method: 'POST' })
        .then(async options => {
          const { attemptId, ...publicKey } = options;
          return { attestation: await startRegistration({ optionsJSON: publicKey }), attemptId };
        });

      return appFetch('/api/auth/webauthn/credentials/verify', {
        method: 'POST',
        body: { attemptId, response: attestation },
      });
    },
    async removePasskey(id: string) {
      return appFetch(`/api/auth/webauthn/credentials/${id}`, {
        method: 'DELETE',
      });
    },
    async getConnections() {
      return appFetch('/api/auth/webauthn/credentials/');
    },
    async getSessions() {
      return appFetch<SessionsInfo[]>('/api/auth/sessions/');
    },
    async revokeSession(sessionId: string) {
      return appFetch<SessionsInfo[]>(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE'
      });
    },
    async updateProfile(payload: ProfileFormData) {
      return appFetch('/api/auth/profile', { method: 'PATCH', body: payload });
    },
    async check(): Promise<UserResp & { auth?: boolean}> {
      return appFetch<UserResp & { auth?: boolean}>('/auth/check')
        .then(res => {
            if (res.auth) {
              userStore.setUser(res.user);
            } else {
              userStore.clearUser();
            }
            return res;
          })
        .finally(() =>{
          userStore.resolveInit()
        })
    },
  }
}