import { describe, expect, it } from 'vitest'
import { buildAssistantSystemPrompt } from '~~/server/utils/assistant/systemPrompt'
import { PostMode } from '~~/shared/types/posts'

describe('buildAssistantSystemPrompt', () => {
  const formContext = {
    path: '/office/posts/create',
    formOpen: true,
    postFormSnapshot: {
      mode: PostMode.Formatted,
      title: 'F1',
      description: '',
      url: '',
      content: '',
      contentHtml: '',
      tags: [],
    },
  }

  it('tells the model to search_web when drafting with a form open', () => {
    const prompt = buildAssistantSystemPrompt({
      loggedIn: true,
      context: formContext,
    })

    expect(prompt).toContain('search_web')
    expect(prompt).toContain('get_current_time')
    expect(prompt).toContain('Current server time (UTC):')
    expect(prompt).toContain('REQUIRED - call propose_form_patch')
    expect(prompt).toContain('prefer One')
    expect(prompt).toContain('description ≤300')
    expect(prompt).toContain('data-carousel-slot')
    expect(prompt).toContain('gallery-1')
    expect(prompt).toContain('NOT N carousels')
    expect(prompt).toContain('Cover reuse')
    expect(prompt).toContain('includeImageDescriptions')
    expect(prompt).toContain('alt vs description')
    expect(prompt).toContain('Do NOT call propose_navigation while the form is open')
    expect(prompt).toContain('search_posts_semantic to reuse tone')
    expect(prompt).not.toContain('Optionally list_posts')
    expect(prompt).toContain('title: F1')
    expect(prompt).toContain('Provider mode: LOCAL/full')
    expect(prompt).toContain('usable article')
  })

  it('keeps full draft→images order on rate-limited providers with small batches', () => {
    const prompt = buildAssistantSystemPrompt({
      loggedIn: true,
      context: formContext,
      limitImages: true,
    })

    expect(prompt).toContain('RATE-LIMITED')
    expect(prompt).toContain('REQUIRED - call propose_form_patch')
    expect(prompt).toContain('BEFORE any image tools')
    expect(prompt).toContain('perPage<=3')
    expect(prompt).toContain('<=4 picks')
    expect(prompt).not.toContain('Do NOT call search_images')
    expect(prompt).not.toContain('IMAGE-ONLY')
    expect(prompt).not.toContain('SPLIT TURNS')
  })

  it('keeps guide mode when no form is open', () => {
    const prompt = buildAssistantSystemPrompt({
      loggedIn: false,
      context: { path: '/posts' },
    })

    expect(prompt).toContain('No post form is open')
    expect(prompt).toContain('propose_navigation')
    expect(prompt).toContain('get_current_time')
    expect(prompt).not.toContain('Do NOT call propose_navigation while the form is open')
  })
})