import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';
import { sanitizeCarouselSlot } from '~~/shared/assistant/carouselSlots';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    carousel: {
      insertCarousel: (imageIds: (string | number)[]) => ReturnType;
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
        default: [],
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
          const imageIds = (attributes.imageIds as (string | number)[] | undefined) ?? [];
          return {
            'data-carousel': 'true',
            'data-image-ids': imageIds.join(','),
          };
        },
      },
      carouselSlot: {
        default: null as string | null,
        keepOnSplit: true,
        parseHTML: (element: HTMLElement) => {
          const raw = element.getAttribute('data-carousel-slot');
          return raw && raw.trim() ? sanitizeCarouselSlot(raw) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const slot = attributes.carouselSlot;
          if (typeof slot !== 'string' || !slot.trim())
            return {};
          return { 'data-carousel-slot': sanitizeCarouselSlot(slot) };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-carousel][data-carousel-slot]' },
      { tag: 'div[data-carousel]' },
    ];
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
        (imageIds: (string | number)[]) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            type: this.name,
            attrs: { imageIds },
          }),
    };
  },
});