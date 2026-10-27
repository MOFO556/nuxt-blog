import { Mark, mergeAttributes } from '@tiptap/core';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';

const htmlPresentationalAttrs = {
  class: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.getAttribute('class'),
    renderHTML: (attributes: Record<string, unknown>) => {
      if (!attributes.class)
        return {};
      
      return { class: String(attributes.class) };
    },
  },
  style: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.getAttribute('style'),
    renderHTML: (attributes: Record<string, unknown>) => {
      if (!attributes.style)
        return {};
      
      return { style: String(attributes.style) };
    },
  },
};

function withHtmlAttrs<T extends { extend: (config: object) => T }>(Extension: T): T {
  return Extension.extend({
    addAttributes() {
      return {
        // @ts-expect-error parent attrs from TipTap node
        ...this.parent?.(),
        ...htmlPresentationalAttrs,
      };
    },
  });
}

export const HtmlSpanMark = Mark.create({
  name: 'htmlSpan',
  inclusive: true,
  parseHTML() {
    return [{ tag: 'span' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return { ...htmlPresentationalAttrs };
  },
});

export const StyledParagraph = withHtmlAttrs(Paragraph);
export const StyledHeading = withHtmlAttrs(Heading);
export const StyledBlockquote = withHtmlAttrs(Blockquote);
export const StyledBulletList = withHtmlAttrs(BulletList);
export const StyledOrderedList = withHtmlAttrs(OrderedList);
export const StyledListItem = withHtmlAttrs(ListItem);

export const styledHtmlNodeExtensions = [
  StyledParagraph,
  StyledHeading,
  StyledBlockquote,
  StyledBulletList,
  StyledOrderedList,
  StyledListItem,
  HtmlSpanMark,
];

export const styledStarterKitOptions = {
  paragraph: false as const,
  heading: false as const,
  blockquote: false as const,
  bulletList: false as const,
  orderedList: false as const,
  listItem: false as const,
};