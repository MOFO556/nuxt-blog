import type { AssistantFormPatch } from '~~/shared/types/assistant';
import { PostMode } from '~~/shared/types/posts';

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainTextToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed)
    return '<p></p>';
  return trimmed
    .split(/\n{2,}/)
    .map(block => `<p>${escapeHtmlText(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function isTipTapDocJson(value: string | undefined): value is string {
  if (!value?.trim())
    return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object'
      && parsed !== null
      && (parsed as { type?: unknown }).type === 'doc';
  }
  catch {
    return false;
  }
}

export function normalizeFormPatchForMode(
  mode: PostMode | string,
  patch: AssistantFormPatch,
): AssistantFormPatch {
  if (mode !== PostMode.Formatted)
    return { ...patch };

  const contentHtml = patch.contentHtml?.trim()
    ? patch.contentHtml
    : (patch.content ? plainTextToHtml(patch.content) : undefined);

  return {
    ...patch,
    contentHtml,
    content: isTipTapDocJson(patch.content) ? patch.content : undefined,
  };
}