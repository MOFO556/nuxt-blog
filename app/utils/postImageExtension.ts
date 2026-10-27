import Image from '@tiptap/extension-image';

function presentationalAttrs() {
  return {
    class: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('class'),
      renderHTML: (attributes: Record<string, unknown>) => {
        if (!attributes.class)
          return {};
        
        return { class: String(attributes.class) };
      },
    },
    style: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('style'),
      renderHTML: (attributes: Record<string, unknown>) => {
        if (!attributes.style)
          return {};
        
        return { style: String(attributes.style) };
      },
    },
  };
}

export const PostImageExtension = Image.extend({
  name: 'image',
  addAttributes() {
    return {
      ...this.parent?.(),
      imageId: {
        default: null as string | number | null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-image-id'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (attributes.imageId == null)
            return {};
          
          return { 'data-image-id': String(attributes.imageId) };
        },
      },
      ...presentationalAttrs(),
    };
  },
});