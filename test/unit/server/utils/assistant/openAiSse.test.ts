import { describe, expect, it } from 'vitest'
import {
  chatRequestWantsStream,
  forceChatCompletionNonStreaming,
  openAiChatCompletionToSse,
} from '~~/server/utils/assistant/openAiSse'

describe('chatRequestWantsStream', () => {
  it('detects stream:true chat bodies', () => {
    expect(chatRequestWantsStream('{"stream":true,"model":"x"}')).toBe(true)
    expect(chatRequestWantsStream('{"stream":false}')).toBe(false)
    expect(chatRequestWantsStream(undefined)).toBe(false)
  })
})

describe('forceChatCompletionNonStreaming', () => {
  it('sets stream false and drops stream_options', () => {
    expect(JSON.parse(forceChatCompletionNonStreaming(
      '{"stream":true,"stream_options":{"include_usage":true},"model":"m"}',
    ))).toEqual({ stream: false, model: 'm' })
  })
})

describe('openAiChatCompletionToSse', () => {
  it('synthesizes text content chunks and DONE', () => {
    const sse = openAiChatCompletionToSse(JSON.stringify({
      id: 'chatcmpl-1',
      created: 1,
      model: 'm',
      choices: [{
        message: { role: 'assistant', content: 'hello' },
        finish_reason: 'stop',
      }],
    }))
    expect(sse).toContain('data: ')
    expect(sse).toContain('"content":"hello"')
    expect(sse).toContain('"finish_reason":"stop"')
    expect(sse.trimEnd()).toMatch(/data: \[DONE\]$/)
  })

  it('synthesizes tool_call argument chunks', () => {
    const sse = openAiChatCompletionToSse(JSON.stringify({
      id: 'chatcmpl-2',
      created: 2,
      model: 'm',
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: { name: 'search_images', arguments: '{"query":"f1"}' },
          }],
        },
        finish_reason: 'tool_calls',
      }],
    }))
    expect(sse).toContain('"name":"search_images"')
    expect(sse).toContain('\\"query\\":\\"f1\\"')
    expect(sse).toContain('"finish_reason":"tool_calls"')
  })

  it('returns null when the body is not a chat completion', () => {
    expect(openAiChatCompletionToSse('not-json')).toBeNull()
    expect(openAiChatCompletionToSse('{"choices":[]}')).toBeNull()
    expect(openAiChatCompletionToSse('{"error":{"message":"nope"}}')).toBeNull()
  })

  it('passes an existing SSE body through', () => {
    const sse = 'data: {"x":1}\n\n'
    expect(openAiChatCompletionToSse(sse)).toBe(sse)
  })
})