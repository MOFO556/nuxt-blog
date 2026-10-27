import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

export type CarouselAttrs = {
  imageIds: Array<string | number>;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    carousel: {
      insertCarousel: (imageIds: Array<string | number>) => ReturnType;
    };
  }
}

export const CarouselExtension = Node.create({
  name: 'carousel',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      imageIds: {
        default: [] as Array<string | number>,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-image-ids') ?? '';
          return raw
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .map((id: string) => {
              const asNum = Number(id);
              return Number.isFinite(asNum) && String(asNum) === id ? asNum : id;
            });
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const imageIds = (attributes.imageIds as Array<string | number> | undefined) ?? [];
          return {
            'data-carousel': 'true',
            'data-image-ids': imageIds.join(','),
          };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-carousel]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-carousel': 'true',
        class: 'post-carousel-marker',
      }),
      '\u00a0',
    ];
  },

  addCommands() {
    return {
      insertCarousel:
        (imageIds: Array<string | number>) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            type: this.name,
            attrs: { imageIds },
          }),
    };
  },
});