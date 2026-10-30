import sanitizeHtml from 'sanitize-html';
import { normalizeHtmlStyles } from './normalizeHtmlStyles';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'code', 'pre',
  'blockquote',
  'ul', 'ol', 'li',
  'a',
  'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
];

export function sanitizePostHtml(dirty: string): string {
  return sanitizeHtml(normalizeHtmlStyles(dirty), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': ['class', 'style'],
      a: ['href', 'name', 'target', 'rel', 'class', 'style'],
      img: ['src', 'alt', 'title', 'class', 'style', 'width', 'height', 'data-image-id'],
      div: ['data-carousel', 'data-carousel-slot', 'data-image-ids', 'class', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  });
}
