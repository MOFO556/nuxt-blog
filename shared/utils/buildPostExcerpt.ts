import { PostMode } from '../types/posts';
import { stripHtml } from './stripHtml';

const EXCERPT_MAX = 200;

type BuildPostExcerptInput = {
  description?: string | null;
  content: string;
  contentHtml?: string | null;
  mode: PostMode;
};

function truncate(text: string, max: number): string {
  if (text.length <= max)
    return text;

  return text.slice(0, max).trimEnd();
}

export function buildPostExcerpt(input: BuildPostExcerptInput): string {
  const description = input.description?.trim();
  if (description)
    return truncate(description, EXCERPT_MAX);

  if (input.mode === PostMode.Formatted)
    return truncate(stripHtml(input.contentHtml ?? ''), EXCERPT_MAX);

  return truncate(input.content.trim(), EXCERPT_MAX);
}
