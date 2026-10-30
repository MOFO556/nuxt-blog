/**
 * Helpers for Windows PowerShell OpenAI-compat fallbacks
 */
export function chatRequestWantsStream(body: string | undefined): boolean {
  if (!body)
    return false;
  try {
    const parsed: unknown = JSON.parse(body);
    return Boolean(
      parsed
      && typeof parsed === 'object'
      && (parsed as { stream?: unknown }).stream === true,
    );
  }
  catch {
    return false;
  }
}

export function forceChatCompletionNonStreaming(body: string): string {
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== 'object')
    return body;
  const next: Record<string, unknown> = {
    ...(parsed as Record<string, unknown>),
    stream: false,
  };
  delete next.stream_options;
  return JSON.stringify(next);
}

type ChatToolCall = {
  id?: unknown;
  type?: unknown;
  function?: { name?: unknown; arguments?: unknown };
};

type ChatCompletionJson = {
  id?: unknown;
  object?: unknown;
  created?: unknown;
  model?: unknown;
  choices?: Array<{
    index?: unknown;
    message?: {
      role?: unknown;
      content?: unknown;
      tool_calls?: ChatToolCall[];
    };
    finish_reason?: unknown;
  }>;
};

function sseData(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Turn a non-streaming chat.completion JSON body into OpenAI-compatible SSE chunks
 * Returns null when the body is not already SSE and has no `choices[0].message`
 */
export function openAiChatCompletionToSse(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.startsWith('data:'))
    return body;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  }
  catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object')
    return null;

  const completion = parsed as ChatCompletionJson;
  const choice = completion.choices?.[0];
  const message = choice?.message;
  if (!message)
    return null;

  const id = typeof completion.id === 'string' ? completion.id : 'chatcmpl-ps';
  const created = typeof completion.created === 'number'
    ? completion.created
    : Math.floor(Date.now() / 1000);
  const model = typeof completion.model === 'string' ? completion.model : 'unknown';
  const finishReason = typeof choice?.finish_reason === 'string'
    ? choice.finish_reason
    : 'stop';

  const base = {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
  };

  const chunks: string[] = [];
  chunks.push(sseData({
    ...base,
    choices: [{
      index: 0,
      delta: { role: typeof message.role === 'string' ? message.role : 'assistant' },
      finish_reason: null,
    }],
  }));

  if (typeof message.content === 'string' && message.content.length > 0) {
    chunks.push(sseData({
      ...base,
      choices: [{
        index: 0,
        delta: { content: message.content },
        finish_reason: null,
      }],
    }));
  }

  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  for (const [index, toolCall] of toolCalls.entries()) {
    const name = typeof toolCall.function?.name === 'string'
      ? toolCall.function.name
      : '';
    const args = typeof toolCall.function?.arguments === 'string'
      ? toolCall.function.arguments
      : JSON.stringify(toolCall.function?.arguments ?? {});
    const toolId = typeof toolCall.id === 'string' ? toolCall.id : `call_${index}`;
    chunks.push(sseData({
      ...base,
      choices: [{
        index: 0,
        delta: {
          tool_calls: [{
            index,
            id: toolId,
            type: 'function',
            function: { name, arguments: '' },
          }],
        },
        finish_reason: null,
      }],
    }));
    if (args) {
      chunks.push(sseData({
        ...base,
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index,
              function: { arguments: args },
            }],
          },
          finish_reason: null,
        }],
      }));
    }
  }

  chunks.push(sseData({
    ...base,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: finishReason,
    }],
  }));
  chunks.push('data: [DONE]\n\n');
  return chunks.join('');
}