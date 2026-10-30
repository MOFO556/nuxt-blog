import type { PostImageMeta } from '~/types/posts';

type AttachmentDescriptionKeepItem = {
  existingPath: string;
  description: string | undefined;
};

export function applyAttachmentDescription(
  lists: PostImageMeta[][],
  path: string,
  next: string,
): void {
  for (const list of lists) {
    for (const attachment of list) {
      if (attachment.path === path)
        attachment.description = next;
    }
  }
}

export function buildAttachmentDescriptionPayload(
  keep: PostImageMeta[],
  editedPath: string,
  nextDescription: string,
): AttachmentDescriptionKeepItem[] {
  return keep
    .filter((a): a is PostImageMeta & { path: string } =>
      typeof a.path === 'string' && a.path.length > 0)
    .map(a => ({
      existingPath: a.path,
      description: a.path === editedPath
        ? nextDescription
        : (a.description ?? undefined),
    }));
}
