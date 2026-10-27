import type {
  PostFormattedFields,
  PostModeSwitchArgs,
  PostModeSwitchFilesArgs,
  PostModeSwitchFilesResult,
} from '~/types/posts';
import { PostMode } from '~~/shared/types/posts';
import { escapeHtmlText, stripHtml } from '~~/shared/utils/stripHtml';

export function looksLikeTipTapJson(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || !('type' in parsed))
      return false;
    
    return parsed.type === 'doc';
  }
  catch {
    return false;
  }
}

export function plainTextToFormattedFields(plain: string): PostFormattedFields {
  const text = plain.trim();
  return {
    contentHtml: text ? `<p>${escapeHtmlText(text)}</p>` : '<p></p>',
    content: JSON.stringify({
      type: 'doc',
      content: text
        ? [{ type: 'paragraph', content: [{ type: 'text', text }] }]
        : [{ type: 'paragraph' }],
    }),
  };
}

export function formattedFieldsToLegacyPlain(
  content: string,
  contentHtml: string,
): string {
  const fromHtml = stripHtml(contentHtml || '');
  if (fromHtml)
    return fromHtml;
  
  return looksLikeTipTapJson(content) ? '' : content;
}

export function resolveModeSwitch(args: PostModeSwitchArgs): PostFormattedFields {
  if (args.next === args.previous)
    return { content: args.content, contentHtml: args.contentHtml };
  
  if (args.next === PostMode.Legacy)
    return {
      content: formattedFieldsToLegacyPlain(args.content, args.contentHtml),
      contentHtml: '',
    };
    
  if (looksLikeTipTapJson(args.content))
    return { content: args.content, contentHtml: args.contentHtml };
  
  return plainTextToFormattedFields(args.content || '');
}

export function resolveModeSwitchFiles(
  args: PostModeSwitchFilesArgs,
): PostModeSwitchFilesResult {
  if (args.next === args.previous)
    return {
      images: args.images,
      cover: args.cover,
      contentImages: args.contentImages,
      coverIndex: args.coverIndex ?? null,
    };
    

  if (args.next === PostMode.Formatted)
    return {
      images: [],
      cover: [],
      contentImages: [...args.images],
      coverIndex: null,
    };    

  const hadCover = args.cover.length > 0;
  const images = [
    ...args.cover.map((file, index) => {
      file.postCover = index === 0;
      return file;
    }),
    ...args.contentImages.map((file) => {
      file.postCover = false;
      return file;
    }),
  ];

  return {
    images,
    cover: [],
    contentImages: [],
    coverIndex: hadCover ? 0 : null,
  };
}