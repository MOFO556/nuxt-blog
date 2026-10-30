import type {
  UIMessage
} from 'ai';
import type {
  AssistantPendingFormPatch,
  AssistantPendingImage,
  AssistantPendingImageBatch,
  AssistantPendingNavigation,
  AssistantUIMessagePart,
} from '~/types/assistant';
import { isRecord } from '~~/shared/utils/isRecord';

function readAwaitingOutput(part: AssistantUIMessagePart): Record<string, unknown> | null {
  if (!part.type.startsWith('tool-'))
    return null;
  if (!('output' in part) || !isRecord(part.output))
    return null;
  if (part.output.status !== 'awaiting_user_confirm')
    return null;
  return part.output;
}

function toolCallIdOf(part: AssistantUIMessagePart): string | undefined {
  return 'toolCallId' in part && typeof part.toolCallId === 'string'
    ? part.toolCallId
    : undefined;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value))
    return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string')
      out[key] = entry;
  }
  return out;
}

function asFormPatch(value: unknown): AssistantFormPatch {
  if (!isRecord(value))
    return {};
  const patch: AssistantFormPatch = {};
  if (typeof value.title === 'string')
    patch.title = value.title;
  if (typeof value.description === 'string')
    patch.description = value.description;
  if (typeof value.url === 'string')
    patch.url = value.url;
  if (typeof value.content === 'string')
    patch.content = value.content;
  if (typeof value.contentHtml === 'string')
    patch.contentHtml = value.contentHtml;
  if (Array.isArray(value.tags) && value.tags.every(t => typeof t === 'string'))
    patch.tags = value.tags;
  return patch;
}

function asPendingImage(
  img: Record<string, unknown>,
  extras: {
    reason?: string | null;
    toolCallId?: string;
    includeImageDescriptions?: boolean;
  },
): AssistantPendingImage {
  return {
    imageId: typeof img.imageId === 'string' ? img.imageId : '',
    regularUrl: typeof img.regularUrl === 'string' ? img.regularUrl : '',
    thumbUrl: typeof img.thumbUrl === 'string'
      ? img.thumbUrl
      : (typeof img.regularUrl === 'string' ? img.regularUrl : ''),
    alt: typeof img.alt === 'string' ? img.alt : null,
    photographer: typeof img.photographer === 'string' ? img.photographer : null,
    downloadLocation: typeof img.downloadLocation === 'string' ? img.downloadLocation : null,
    asCover: Boolean(img.asCover),
    alsoInContent: Boolean(img.alsoInContent),
    forCarousel: Boolean(img.forCarousel),
    carouselSlot: typeof img.carouselSlot === 'string' && img.carouselSlot.trim()
      ? img.carouselSlot.trim()
      : null,
    includeImageDescriptions: extras.includeImageDescriptions === true
      || img.includeImageDescriptions === true,
    reason: extras.reason ?? null,
    toolCallId: extras.toolCallId,
  };
}

function lastAssistantMessage(messages: UIMessage[]): UIMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === 'assistant')
      return message;
  }
  return null;
}

function appendToImageBatch(
  previous: AssistantPendingImageBatch | null,
  nextImages: AssistantPendingImage[],
  reason: string | null,
  incomingToolCallIds: string[],
): AssistantPendingImageBatch {
  if (previous === null) {
    return {
      images: [...nextImages],
      reason,
      toolCallId: incomingToolCallIds[0],
      toolCallIds: [...incomingToolCallIds],
    };
  }

  return {
    images: [...previous.images, ...nextImages],
    reason: previous.reason ?? reason,
    toolCallId: previous.toolCallId ?? incomingToolCallIds[0],
    toolCallIds: [...previous.toolCallIds, ...incomingToolCallIds],
  };
}

/**
 * Only surface Confirm/Accept panes from the latest assistant turn.
 * Older awaiting_user_confirm tools stay in history but do not reopen UI.
 */
export function scanAssistantProposals(messages: UIMessage[]): {
  navigation: AssistantPendingNavigation | null;
  formPatch: AssistantPendingFormPatch | null;
  images: AssistantPendingImage[];
  imageBatch: AssistantPendingImageBatch | null;
} {
  let navigation: AssistantPendingNavigation | null = null;
  let formPatch: AssistantPendingFormPatch | null = null;
  let imageBatch: AssistantPendingImageBatch | null = null;
  const images: AssistantPendingImage[] = [];

  const message = lastAssistantMessage(messages);
  if (!message)
    return { navigation, formPatch, images, imageBatch };

  for (const part of message.parts) {
    const output = readAwaitingOutput(part);
    if (!output)
      continue;
    const toolName = part.type.replace(/^tool-/, '');
    const toolCallId = toolCallIdOf(part);
    const reason = typeof output.reason === 'string' ? output.reason : null;

    if (toolName === 'propose_navigation' && typeof output.path === 'string' && !navigation)
      navigation = {
        path: output.path,
        query: asStringRecord(output.query),
        reason,
        toolCallId,
      };

    if (toolName === 'propose_form_patch' && !formPatch)
      formPatch = {
        patch: asFormPatch(output.patch),
        reason,
        toolCallId,
      };

    if (toolName === 'propose_stage_images' && Array.isArray(output.images)) {
      const includeImageDescriptions = output.includeImageDescriptions === true;
      const batchImages = output.images
        .filter(isRecord)
        .map(img => asPendingImage(img, { reason, toolCallId, includeImageDescriptions }));
      if (batchImages.length) {
        const incomingIds: string[] = toolCallId ? [toolCallId] : [];
        imageBatch = appendToImageBatch(imageBatch, batchImages, reason, incomingIds);
      }
    }

    if (toolName === 'propose_stage_image' && isRecord(output.image))
      images.push(asPendingImage(output.image, {
        reason,
        toolCallId,
        includeImageDescriptions: output.includeImageDescriptions === true,
      }));
  }

  if (images.length) {
    const foldedReason = images[0]?.reason ?? null;
    const foldedIds: string[] = images
      .map(image => image.toolCallId)
      .filter((id): id is string => Boolean(id));
    imageBatch = appendToImageBatch(imageBatch, images, foldedReason, foldedIds);
    images.length = 0;
  }

  return { navigation, formPatch, images, imageBatch };
}

export function collectAwaitingProposalIds(messages: UIMessage[]): string[] {
  const ids: string[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant')
      continue;
    for (const part of message.parts) {
      if (!readAwaitingOutput(part))
        continue;
      const id = toolCallIdOf(part);
      if (id)
        ids.push(id);
    }
  }
  return ids;
}