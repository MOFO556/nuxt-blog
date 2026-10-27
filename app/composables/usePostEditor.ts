import type { PostEditorEmit, PostEditorShell } from '~/types/posts';
import { normalizeHtmlStyles } from '~~/shared/utils/normalizeHtmlStyles';
import { buildPostEditorToolbarItems } from '~/utils/postEditorToolbar';

export function usePostEditor(
  contentJson: Ref<string>,
  contentHtml: Ref<string>,
  emit: PostEditorEmit,
) {
  const showSource = ref(false);
  const sourceHtml = ref('');
  const editorRef = ref<PostEditorShell | null>(null);
  const lockAuthoredHtml = ref(false);

  const htmlModel = computed({
    get: () => contentHtml.value || '<p></p>',
    set: (html: string) => {
      if (lockAuthoredHtml.value)
        return;
      
      contentHtml.value = html;
      syncJsonFromEditor();
    },
  });

  const toolbarItems = computed(() => buildPostEditorToolbarItems({
    showSource: showSource.value,
    onInsertImage: () => emit('insertImageRequest'),
    onInsertCarousel: () => emit('insertCarouselRequest'),
    onToggleSource: toggleSource,
  }));

  function syncJsonFromEditor() {
    const ed = editorRef.value?.editor;
    if (!ed)
      return;
    
    contentJson.value = JSON.stringify(ed.getJSON());
  }

  function refreshTipTapPreview(html: string) {
    const ed = editorRef.value?.editor;
    if (!ed)
      return;
    
    ed.commands.setContent(html, { contentType: 'html', emitUpdate: false });
    syncJsonFromEditor();
  }

  function unlockAuthoredHtml() {
    lockAuthoredHtml.value = false;
  }

  function openSource() {
    sourceHtml.value = contentHtml.value || '';
    showSource.value = true;
  }

  function applySourceHtml() {
    const html = normalizeHtmlStyles(sourceHtml.value);
    lockAuthoredHtml.value = true;
    contentHtml.value = html;
    refreshTipTapPreview(html);
    showSource.value = false;
  }

  function toggleSource() {
    if (showSource.value) {
      applySourceHtml();
      return;
    }
    openSource();
  }

  function appendToAuthoredHtml(snippet: string) {
    const base = (contentHtml.value || '').replace(/\s*<p><\/p>\s*$/i, '');
    contentHtml.value = `${base}${snippet}<p></p>`;
    lockAuthoredHtml.value = true;
    refreshTipTapPreview(contentHtml.value);
  }

  function insertImageAtCursor(src: string, imageId: string | number) {
    if (lockAuthoredHtml.value) {
      appendToAuthoredHtml(
        `<img src="${src}" alt="${String(imageId)}" data-image-id="${String(imageId)}" />`,
      );
      return;
    }
    const ed = editorRef.value?.editor;
    ed?.chain().focus().insertContent({
      type: 'image',
      attrs: { src, alt: String(imageId), imageId },
    }).run();
    contentHtml.value = ed?.getHTML() ?? contentHtml.value;
    syncJsonFromEditor();
  }

  function insertCarousel(imageIds: Array<string | number>) {
    const ids = imageIds.join(',');
    const html = contentHtml.value || '';
    const keepAuthored = lockAuthoredHtml.value
      || /class=["'][^"']+["']/.test(html)
      || /style=["'][^"']+["']/.test(html);

    if (keepAuthored) {
      appendToAuthoredHtml(
        `<div data-carousel="true" data-image-ids="${ids}" class="post-carousel-marker">&nbsp;</div>`,
      );
      return;
    }

    const ed = editorRef.value?.editor;
    ed?.chain().focus().insertContent({
      type: 'carousel',
      attrs: { imageIds },
    }).run();
    contentHtml.value = ed?.getHTML() ?? contentHtml.value;
    syncJsonFromEditor();
  }

  const editorProps = {
    handleDOMEvents: {
      keydown: () => {
        unlockAuthoredHtml();
        return false;
      },
      paste: () => {
        unlockAuthoredHtml();
        return false;
      },
    },
  };

  return {
    showSource,
    sourceHtml,
    editorRef,
    lockAuthoredHtml,
    htmlModel,
    toolbarItems,
    editorProps,
    syncJsonFromEditor,
    applySourceHtml,
    insertImageAtCursor,
    insertCarousel,
  };
}