import { generateJSON } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CarouselExtension } from '~/utils/carouselExtension';
import { HtmlDivExtension } from '~/utils/htmlDivExtension';
import { PostImageExtension } from '~/utils/postImageExtension';
import {
  styledHtmlNodeExtensions,
  styledStarterKitOptions,
} from '~/utils/styledHtmlNodes';

export function createPostEditorExtensions() {
  return [
    StarterKit.configure(styledStarterKitOptions),
    HtmlDivExtension,
    ...styledHtmlNodeExtensions,
    PostImageExtension,
    CarouselExtension,
  ];
}

export function contentJsonFromHtml(html: string): string {
  const source = html.trim() ? html : '<p></p>';
  return JSON.stringify(generateJSON(source, createPostEditorExtensions()));
}