import { describe, expect, it } from 'vitest'
import { isAssistantEditorPath } from '~~/shared/assistant/isEditorPath'

describe('isAssistantEditorPath', () => {
  it('detects create and edit routes', () => {
    expect(isAssistantEditorPath('/office/posts/create')).toBe(true)
    expect(isAssistantEditorPath('/office/posts/12/edit')).toBe(true)
    expect(isAssistantEditorPath('/office/posts/12/edit?x=1')).toBe(true)
  })

  it('rejects other paths', () => {
    expect(isAssistantEditorPath('/posts')).toBe(false)
    expect(isAssistantEditorPath('/office/posts/12')).toBe(false)
    expect(isAssistantEditorPath(undefined)).toBe(false)
  })
})
