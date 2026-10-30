import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import type { AssistantUIMessagePart } from '~/types/assistant'
import { compactAssistantMessagesForModel } from '~~/server/utils/assistant/compactMessages'
import { isRecord } from '~~/shared/utils/isRecord'

function textMessage(
  id: string,
  role: UIMessage['role'],
  text: string,
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text }],
  }
}

function toolOutputPart(
  toolName: string,
  toolCallId: string,
  output: unknown,
): AssistantUIMessagePart {
  return {
    type: 'dynamic-tool',
    toolName,
    toolCallId,
    state: 'output-available',
    input: {},
    output,
  }
}

function assistantMessage(
  id: string,
  parts: AssistantUIMessagePart[],
): UIMessage {
  return {
    id,
    role: 'assistant',
    parts,
  }
}

function readToolOutput(part: AssistantUIMessagePart | undefined): unknown {
  if (!part || !('output' in part))
    return undefined
  return part.output
}

describe('compactAssistantMessagesForModel', () => {
  it('keeps only the newest messages', () => {
    const messages = Array.from({ length: 15 }, (_, i) =>
      textMessage(String(i), i % 2 === 0 ? 'user' : 'assistant', `m${i}`),
    )

    const compact = compactAssistantMessagesForModel(messages, 4)
    expect(compact).toHaveLength(4)
    expect(compact.map(m => m.id)).toEqual(['11', '12', '13', '14'])
  })

  it('truncates large tool outputs', () => {
    const huge = 'x'.repeat(5_000)
    const messages = [
      assistantMessage('1', [
        toolOutputPart('search_web', 't1', { hits: [{ snippet: huge }] }),
      ]),
    ]

    const [message] = compactAssistantMessagesForModel(messages)
    const output = readToolOutput(message?.parts[0])
    expect(isRecord(output) && output.truncated === true).toBe(true)
    expect(isRecord(output) && typeof output.originalChars === 'number'
      && output.originalChars > 1000).toBe(true)
  })

  it('imageLean drops draft/research tools and shortens text', () => {
    const messages = [
      assistantMessage('1', [
        { type: 'text', text: 'x'.repeat(500) },
        toolOutputPart('propose_form_patch', 't1', {
          status: 'awaiting_user_confirm',
          patch: { contentHtml: '<p>huge</p>' },
        }),
        toolOutputPart('search_images', 't2', {
          images: [{ id: 'a', url: 'https://example.com/a.jpg', alt: 'a' }],
        }),
      ]),
    ]

    const [message] = compactAssistantMessagesForModel(messages, {
      keepLast: 4,
      imageLean: true,
      maxTextChars: 40,
      maxToolOutputChars: 200,
    })

    const textPart = message?.parts[0]
    expect(textPart?.type).toBe('text')
    if (textPart?.type === 'text') {
      expect(textPart.text.endsWith('…')).toBe(true)
      expect(textPart.text.length).toBeLessThanOrEqual(41)
    }

    const omitted = readToolOutput(message?.parts[1])
    expect(isRecord(omitted) && omitted.omitted === true).toBe(true)
    expect(isRecord(omitted) && omitted.tool === 'propose_form_patch').toBe(true)

    const kept = readToolOutput(message?.parts[2])
    expect(isRecord(kept) && Array.isArray(kept.images) && kept.images.length === 1).toBe(true)
  })
})