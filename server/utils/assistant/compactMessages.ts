import {
  getToolName,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from 'ai';
import type { AssistantUIMessagePart } from '~/types/assistant';
import { isRecord } from '~~/shared/utils/isRecord';

const DEFAULT_KEEP_MESSAGES = 10;
const DEFAULT_MAX_TOOL_OUTPUT_CHARS = 1_200;
const DEFAULT_MAX_TOOL_INPUT_CHARS = 1_500;
const DEFAULT_MAX_TEXT_CHARS = 4_000;

const IMAGE_TURN_TOOLS = new Set([
  'search_images',
  'propose_stage_image',
  'propose_stage_images',
]);

type CompactAssistantMessagesOptions = {
  keepLast?: number;
  maxToolOutputChars?: number;
  maxToolInputChars?: number;
  maxTextChars?: number;
  imageLean?: boolean;
};

function truncateJson(value: unknown, maxChars: number): unknown {
  const raw = JSON.stringify(value);
  if (raw.length <= maxChars)
    return value;
  return {
    truncated: true,
    preview: raw.slice(0, maxChars),
    originalChars: raw.length,
  };
}

function toolNameOf(part: AssistantUIMessagePart): string | null {
  if (!isToolUIPart(part))
    return null;
  return getToolName(part);
}

function omittedToolPart(
  part: Extract<AssistantUIMessagePart, { type: 'dynamic-tool' } | { type: `tool-${string}` }>,
  toolName: string,
): AssistantUIMessagePart {
  if (part.type === 'dynamic-tool') {
    return {
      type: 'dynamic-tool',
      toolName: part.toolName,
      toolCallId: part.toolCallId,
      state: 'output-available',
      input: {},
      output: { omitted: true, tool: toolName },
    };
  }

  return {
    type: 'dynamic-tool',
    toolName,
    toolCallId: 'toolCallId' in part && typeof part.toolCallId === 'string'
      ? part.toolCallId
      : `omitted-${toolName}`,
    state: 'output-available',
    input: {},
    output: { omitted: true, tool: toolName },
  };
}

function compactToolFields(
  part: AssistantUIMessagePart,
  maxToolInputChars: number,
  maxToolOutputChars: number,
): AssistantUIMessagePart {
  if (!isToolUIPart(part) || !isRecord(part))
    return part;

  const next: Record<string, unknown> = { ...part };
  if ('input' in next)
    next.input = truncateJson(next.input, maxToolInputChars);
  if ('output' in next)
    next.output = truncateJson(next.output, maxToolOutputChars);
  if ('args' in next)
    next.args = truncateJson(next.args, maxToolInputChars);
  if ('result' in next)
    next.result = truncateJson(next.result, maxToolOutputChars);

  return next as typeof part;
}

function compactPart(
  part: AssistantUIMessagePart,
  options: {
    maxToolOutputChars: number;
    maxToolInputChars: number;
    maxTextChars: number;
    imageLean: boolean;
  },
): AssistantUIMessagePart {
  if (isTextUIPart(part)) {
    if (part.text.length <= options.maxTextChars)
      return part;
    return {
      ...part,
      text: `${part.text.slice(0, options.maxTextChars)}…`,
    };
  }

  if (!isToolUIPart(part))
    return part;

  const name = toolNameOf(part);
  if (options.imageLean && name && !IMAGE_TURN_TOOLS.has(name))
    return omittedToolPart(part, name);

  return compactToolFields(
    part,
    options.maxToolInputChars,
    options.maxToolOutputChars,
  );
}

/**
 * Bound prompt size for tight provider ITPM limits: keep the newest turns and
 * shrink large tool payloads (search hits, prior form patches)
 */
export function compactAssistantMessagesForModel(
  messages: UIMessage[],
  keepLastOrOptions: number | CompactAssistantMessagesOptions = DEFAULT_KEEP_MESSAGES,
  maxToolOutputCharsArg = DEFAULT_MAX_TOOL_OUTPUT_CHARS,
): UIMessage[] {
  const options: CompactAssistantMessagesOptions
    = typeof keepLastOrOptions === 'number'
      ? {
          keepLast: keepLastOrOptions,
          maxToolOutputChars: maxToolOutputCharsArg,
        }
      : keepLastOrOptions;

  const keepLast = options.keepLast ?? DEFAULT_KEEP_MESSAGES;
  const maxToolOutputChars = options.maxToolOutputChars ?? DEFAULT_MAX_TOOL_OUTPUT_CHARS;
  const maxToolInputChars = options.maxToolInputChars
    ?? (options.imageLean ? 400 : DEFAULT_MAX_TOOL_INPUT_CHARS);
  const maxTextChars = options.maxTextChars
    ?? (options.imageLean ? 280 : DEFAULT_MAX_TEXT_CHARS);
  const imageLean = options.imageLean === true;

  const kept = messages.length > keepLast
    ? messages.slice(-keepLast)
    : messages;

  return kept.map(message => ({
    ...message,
    parts: message.parts.map(part => compactPart(part, {
      maxToolOutputChars,
      maxToolInputChars,
      maxTextChars,
      imageLean,
    })),
  }));
}