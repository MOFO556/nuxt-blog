import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import {
  collectAwaitingProposalIds,
  scanAssistantProposals,
} from '~/utils/assistantToolParts'

function toolPart(toolName: string, toolCallId: string, output: Record<string, unknown>) {
  return {
    type: `tool-${toolName}`,
    toolCallId,
    state: 'output-available',
    output,
  }
}

describe('scanAssistantProposals', () => {
  it('only reads awaiting tools from the latest assistant message', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          toolPart('propose_navigation', 'nav-old', {
            status: 'awaiting_user_confirm',
            path: '/posts',
            query: {},
            reason: 'old',
          }),
        ],
      },
      {
        id: '2',
        role: 'user',
        parts: [{ type: 'text', text: 'draft please' }],
      },
      {
        id: '3',
        role: 'assistant',
        parts: [
          toolPart('propose_form_patch', 'patch-new', {
            status: 'awaiting_user_confirm',
            patch: { title: 'F1' },
            reason: 'draft',
          }),
        ],
      },
    ] as UIMessage[]

    const found = scanAssistantProposals(messages)
    expect(found.navigation).toBeNull()
    expect(found.formPatch?.patch.title).toBe('F1')
    expect(found.formPatch?.toolCallId).toBe('patch-new')
  })

  it('merges every propose_stage_images call and folds singles into one batch', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          toolPart('propose_form_patch', 'patch-1', {
            status: 'awaiting_user_confirm',
            patch: { title: 'Game' },
          }),
          toolPart('propose_stage_images', 'batch-1', {
            status: 'awaiting_user_confirm',
            images: [
              {
                imageId: 'a',
                regularUrl: 'https://example.com/a.jpg',
                forCarousel: true,
                carouselSlot: 'event-1',
              },
            ],
            reason: 'dish 1',
          }),
          toolPart('propose_stage_images', 'batch-2', {
            status: 'awaiting_user_confirm',
            images: [
              {
                imageId: 'b',
                regularUrl: 'https://example.com/b.jpg',
                forCarousel: true,
                carouselSlot: 'event-2',
              },
            ],
            reason: 'dish 2',
          }),
          toolPart('propose_stage_image', 'img-3', {
            status: 'awaiting_user_confirm',
            image: {
              imageId: 'c',
              regularUrl: 'https://example.com/c.jpg',
              forCarousel: true,
              carouselSlot: 'event-3',
            },
          }),
        ],
      },
    ] as UIMessage[]

    const found = scanAssistantProposals(messages)
    expect(found.formPatch?.patch.title).toBe('Game')
    expect(found.images).toHaveLength(0)
    expect(found.imageBatch?.images).toHaveLength(3)
    expect(found.imageBatch?.toolCallIds).toEqual(['batch-1', 'batch-2', 'img-3'])
    expect(found.imageBatch?.images.map(i => i.carouselSlot)).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ])
    expect(found.imageBatch?.images.every(i => i.includeImageDescriptions === false)).toBe(true)
  })

  it('keeps alt and records includeImageDescriptions from the tool output', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          toolPart('propose_stage_images', 'batch-1', {
            status: 'awaiting_user_confirm',
            includeImageDescriptions: true,
            images: [
              {
                imageId: 'a',
                regularUrl: 'https://example.com/a.jpg',
                alt: 'A race car on track',
                forCarousel: true,
                carouselSlot: 'event-1',
              },
            ],
          }),
        ],
      },
    ] as UIMessage[]

    const found = scanAssistantProposals(messages)
    expect(found.imageBatch?.images[0]?.alt).toBe('A race car on track')
    expect(found.imageBatch?.images[0]?.includeImageDescriptions).toBe(true)
  })

  it('collects every awaiting toolCallId for history suppression', () => {
    const messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          toolPart('propose_navigation', 'nav-1', {
            status: 'awaiting_user_confirm',
            path: '/posts',
            query: {},
          }),
          toolPart('propose_form_patch', 'patch-1', {
            status: 'awaiting_user_confirm',
            patch: { title: 'A' },
          }),
        ],
      },
    ] as UIMessage[]

    expect(collectAwaitingProposalIds(messages)).toEqual(['nav-1', 'patch-1'])
  })
})
