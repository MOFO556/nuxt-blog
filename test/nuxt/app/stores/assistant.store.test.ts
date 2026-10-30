import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAssistantStore } from '~/stores/assistant.store'

describe('useAssistantStore overlay mutex', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('closes filters when opening chat', () => {
    const store = useAssistantStore()
    store.filtersOpen = true
    store.openChat()
    expect(store.open).toBe(true)
    expect(store.filtersOpen).toBe(false)
  })

  it('closes chat when opening filters', () => {
    const store = useAssistantStore()
    store.open = true
    store.setFiltersOpen(true)
    expect(store.filtersOpen).toBe(true)
    expect(store.open).toBe(false)
  })
})
