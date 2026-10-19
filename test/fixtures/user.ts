import { faker } from '@faker-js/faker'

export function buildRegisterPayload(overrides: {
  login?: string
  password?: string
  usePassKey?: boolean
} = {}) {
  return {
    login: overrides.login ?? faker.internet.username({ firstName: 'user' }).slice(0, 20).padEnd(5, 'x'),
    password: overrides.password ?? 'secret12',
    usePassKey: overrides.usePassKey ?? false,
  }
}

export function buildLoginPayload(overrides: {
  login?: string
  password?: string
} = {}) {
  return {
    login: overrides.login ?? 'testuser',
    password: overrides.password ?? 'secret12',
  }
}
