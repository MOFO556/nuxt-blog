import type { EditorToolbarItem } from '@nuxt/ui';

export function buildPostEditorToolbarItems(args: {
  showSource: boolean;
  onInsertImage: () => void;
  onInsertCarousel: () => void;
  onToggleSource: () => void;
}): EditorToolbarItem[][] {
  return [[{
    kind: 'bold',
    icon: 'i-lucide-bold',
  }, {
    kind: 'italic',
    icon: 'i-lucide-italic',
  }, {
    kind: 'underline',
    icon: 'i-lucide-underline',
  }, {
    kind: 'strike',
    icon: 'i-lucide-strikethrough',
  }], [{
    kind: 'heading',
    level: 2,
    icon: 'i-lucide-heading-2',
  }, {
    kind: 'bulletList',
    icon: 'i-lucide-list',
  }, {
    kind: 'orderedList',
    icon: 'i-lucide-list-ordered',
  }, {
    kind: 'blockquote',
    icon: 'i-lucide-text-quote',
  }], [{
    icon: 'i-lucide-image',
    label: 'Image',
    onClick: args.onInsertImage,
  }, {
    icon: 'i-lucide-gallery-horizontal',
    label: 'Carousel',
    onClick: args.onInsertCarousel,
  }, {
    icon: args.showSource ? 'i-lucide-eye' : 'i-lucide-code-xml',
    label: args.showSource ? 'Visual' : 'HTML',
    onClick: args.onToggleSource,
  }]];
}