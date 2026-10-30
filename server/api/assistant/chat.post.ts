import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  InvalidToolInputError,
  stepCountIs,
  streamText,
  toUIMessageStream,
} from 'ai';
import { z } from 'zod';
import { loadSession } from '~~/server/utils/auth';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { isAssistantEditorPath } from '~~/shared/assistant/isEditorPath';
import { PostMode } from '~~/shared/types/posts';
import { compactAssistantMessagesForModel } from '#server-utils/assistant/compactMessages';
import { createAssistantChatModel } from '#server-utils/assistant/provider';
import { isTightRateLimitProvider } from '#server-utils/assistant/providerMode';
import { repairToolCallJson } from '#server-utils/assistant/repairToolCallJson';
import { buildAssistantSystemPrompt } from '#server-utils/assistant/systemPrompt';
import { createAssistantTools } from '#server-utils/assistant/tools';
import {
  assistantGuestKey,
  useAssistantGuestRateLimiter,
} from '#server-utils/assistant/guestRateLimit';
import {
  isPersistableRole,
  parseRequestUiMessages,
} from '#server-utils/assistant/parseMessages';
import {
  createThread,
  getThreadForUser,
  replaceThreadMessages,
  touchThreadTitleFromUserMessage,
} from '#server-utils/assistant/threads';

const formSnapshotSchema = z.object({
  mode: z.enum([PostMode.Legacy, PostMode.Formatted]),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  content: z.string(),
  contentHtml: z.string(),
  tags: z.array(z.string()),
}).nullable().optional();

const chatBodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  threadId: z.string().uuid().optional().nullable(),
  context: z.object({
    path: z.string().max(300).optional(),
    formOpen: z.boolean().optional(),
    postFormSnapshot: formSnapshotSchema,
  }).optional(),
});

export default defineEventHandler(async (event) => {
  const session = await loadSession(event);
  const loggedIn = Boolean(session?.user);

  if (!loggedIn) {
    const limiter = useAssistantGuestRateLimiter();
    const result = limiter.check(assistantGuestKey(event));
    if (!result.ok)
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many assistant requests. Try again shortly.',
        data: { retryAfterMs: result.retryAfterMs },
      });
  }

  const body = await useSafeReadValidateBody(event, chatBodySchema);
  const context = body.context ?? {};
  const hasForm = Boolean(context.postFormSnapshot)
    || Boolean(context.formOpen)
    || isAssistantEditorPath(context.path);

  let threadId = body.threadId ?? null;
  if (loggedIn && session) {
    if (threadId) {
      const existing = getThreadForUser(threadId, session.user.id);
      if (!existing)
        throw createError({ statusCode: 404, statusMessage: 'Thread not found' });
    }
    else {
      const created = createThread(session.user.id);
      threadId = created.id;
      setHeader(event, 'x-assistant-thread-id', threadId);
    }
  }

  const messages = await parseRequestUiMessages(body.messages);
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (loggedIn && threadId && lastUser) {
    const textPart = lastUser.parts.find(
      (p): p is { type: 'text'; text: string } =>
        typeof p === 'object'
        && p !== null
        && 'type' in p
        && p.type === 'text'
        && 'text' in p
        && typeof p.text === 'string',
    );
    if (textPart?.text)
      touchThreadTitleFromUserMessage(threadId, textPart.text);
  }

  const runtimeConfig = useRuntimeConfig();
  const limitImages = isTightRateLimitProvider(
    String(runtimeConfig.aiBaseUrl || ''),
    String(runtimeConfig.assistantSplitTurns || ''),
  );
  const model = createAssistantChatModel();
  const tools = createAssistantTools({ loggedIn, hasForm, limitImages });
  const system = buildAssistantSystemPrompt({ loggedIn, context, limitImages });
  const defaultMaxSteps = limitImages ? 12 : 16;
  const maxSteps = Math.min(
    Math.max(Number(runtimeConfig.assistantMaxSteps) || defaultMaxSteps, 4),
    16,
  );
  const modelMessages = compactAssistantMessagesForModel(
    messages,
    limitImages
      ? {
          keepLast: 8,
          maxToolOutputChars: 800,
        }
      : {
          keepLast: 10,
          maxToolOutputChars: 1_200,
        },
  );

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(modelMessages),
    tools,
    stopWhen: stepCountIs(maxSteps),
    maxRetries: 4,
    repairToolCall: async ({ toolCall, error }) => {
      if (!InvalidToolInputError.isInstance(error))
        return null;
      const raw = typeof toolCall.input === 'string'
        ? toolCall.input
        : JSON.stringify(toolCall.input);
      const repaired = repairToolCallJson(raw);
      if (!repaired)
        return null;
      console.warn('[assistant] repaired malformed tool call JSON', toolCall.toolName);
      return { ...toolCall, input: repaired };
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onFinish: ({ messages: finalMessages }) => {
        if (!loggedIn || !threadId)
          return;
        try {
          replaceThreadMessages(
            threadId,
            finalMessages
              .filter(m => isPersistableRole(m.role))
              .map(m => ({
                id: m.id,
                role: m.role,
                parts: m.parts,
              })),
          );
        }
        catch (err) {
          console.warn('[assistant] failed to persist thread messages', err);
        }
      },
    }),
    headers: threadId
      ? { 'x-assistant-thread-id': threadId }
      : undefined,
  });
});