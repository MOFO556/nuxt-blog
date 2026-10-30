import type { AssistantFormPatch, AssistantFormSnapshot } from '~~/shared/types/assistant';
import { PostMode } from '~~/shared/types/posts';

export function applyAssistantFormPatch(
  snapshot: AssistantFormSnapshot,
  patch: AssistantFormPatch,
): AssistantFormSnapshot {
  const keepTipTapJson = snapshot.mode === PostMode.Formatted;
  return {
    mode: snapshot.mode,
    title: patch.title !== undefined ? patch.title : snapshot.title,
    description: patch.description !== undefined ? patch.description : snapshot.description,
    url: patch.url !== undefined ? patch.url : snapshot.url,
    content: keepTipTapJson || patch.content === undefined
      ? snapshot.content
      : patch.content,
    contentHtml: patch.contentHtml !== undefined ? patch.contentHtml : snapshot.contentHtml,
    tags: patch.tags !== undefined ? [...patch.tags] : [...snapshot.tags],
  };
}