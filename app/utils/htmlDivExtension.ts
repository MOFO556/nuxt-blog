import { Node, mergeAttributes } from '@tiptap/core';

export const HtmlDivExtension = Node.create({
  name: 'htmlDiv',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('class'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.class) {
            return {};
          }
          return { class: String(attributes.class) };
        },
      },
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.style) {
            return {};
          }
          return { style: String(attributes.style) };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div',
        getAttrs: (node) => {
          if (typeof node === 'string') {
            return false;
          }
          const el = node as HTMLElement;
          if (el.hasAttribute('data-carousel')) {
            return false;
          }
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },
});