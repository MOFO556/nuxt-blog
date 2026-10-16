import { vi } from 'vitest'
import type { UserResp, SessionsInfo, CredentialsInfo, User } from '#app-types/user'

export type MockApi = {
  auth: {
    login: ReturnType<typeof vi.fn>
    register: ReturnType<typeof vi.fn>
    check: ReturnType<typeof vi.fn>
    getSessions: ReturnType<typeof vi.fn>
    revokeSession: ReturnType<typeof vi.fn>
    getConnections: ReturnType<typeof vi.fn>
    addPasskey: ReturnType<typeof vi.fn>
    removePasskey: ReturnType<typeof vi.fn>
    updateProfile: ReturnType<typeof vi.fn>
    loginPassKey: ReturnType<typeof vi.fn>
    registerPassKey: ReturnType<typeof vi.fn>
  }
  posts: Record<string, ReturnType<typeof vi.fn>>
  comments: Record<string, ReturnType<typeof vi.fn>>
  images: Record<string, ReturnType<typeof vi.fn>>
  tags: Record<string, ReturnType<typeof vi.fn>>
}

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    login: 'testuser',
    password: '',
    ...overrides,
  }
}

export function createMockUserResp(overrides: Partial<UserResp> = {}): UserResp {
  return {
    user: createMockUser(overrides.user),
    token: 'test-token',
    ...overrides,
  }
}

export function createMockSession(overrides: Partial<SessionsInfo> = {}): SessionsInfo {
  return {
    id: 'session-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    city: null,
    country: null,
    userAgent: 'Chrome on Windows (desktop)',
    loginMethod: 'password',
    lastSeenAt: '2026-01-01T00:00:00.000Z',
    invalidated: false,
    invalidReason: null,
    current: true,
    ...overrides,
  }
}

export function createMockCredential(overrides: Partial<CredentialsInfo> = {}): CredentialsInfo {
  return {
    id: 'cred-1',
    backedUp: false,
    deviceType: 'singleDevice',
    city: null,
    country: null,
    userAgent: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function createMockApi(overrides: Partial<MockApi> = {}): MockApi {
  return {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      check: vi.fn().mockResolvedValue({ auth: false }),
      getSessions: vi.fn().mockResolvedValue([]),
      revokeSession: vi.fn().mockResolvedValue([]),
      getConnections: vi.fn().mockResolvedValue([]),
      addPasskey: vi.fn(),
      removePasskey: vi.fn(),
      updateProfile: vi.fn(),
      loginPassKey: vi.fn(),
      registerPassKey: vi.fn(),
      ...overrides.auth,
    },
    posts: { ...overrides.posts },
    comments: { ...overrides.comments },
    images: { ...overrides.images },
    tags: { ...overrides.tags },
  }
}
