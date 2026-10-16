import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'

registerEndpoint('/api/auth/check', () => ({ auth: false }))
registerEndpoint('/auth/check', () => ({ auth: false }))

mockNuxtImport('ensureAuthChecked', () => {
  return () => Promise.resolve()
})
