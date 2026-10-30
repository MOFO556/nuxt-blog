import type { Ref } from 'vue';
import type { PostEditorExpose } from '~/types/posts';
import { contentJsonFromHtml } from '~/utils/postEditorContent';

export function usePendingTipTapHtmlSync(
  editorRef: Ref<PostEditorExpose | null>,
  getHtml: () => string,
  setContent: (content: string) => void,
) {
  const pendingTipTapHtmlSync = ref(false);

  function markTipTapHtmlSyncNeeded() {
    pendingTipTapHtmlSync.value = true;
  }

  function clearPendingTipTapHtmlSync() {
    pendingTipTapHtmlSync.value = false;
  }

  function flushTipTapHtmlSync() {
    if (!pendingTipTapHtmlSync.value || !editorRef.value)
      return;
    const synced = editorRef.value.setHtmlContent(
      getHtml(),
      { lockAuthored: true },
    );
    if (synced)
      pendingTipTapHtmlSync.value = false;
  }

  watch(
    () => editorRef.value?.editor ?? null,
    (editor) => {
      if (editor)
        flushTipTapHtmlSync();
    },
  );

  async function flushTipTapHtmlSyncBeforeSubmit() {
    flushTipTapHtmlSync();
    if (pendingTipTapHtmlSync.value) {
      await nextTick();
      flushTipTapHtmlSync();
    }
    if (pendingTipTapHtmlSync.value) {
      setContent(contentJsonFromHtml(getHtml()));
      pendingTipTapHtmlSync.value = false;
    }
  }

  return {
    pendingTipTapHtmlSync,
    markTipTapHtmlSyncNeeded,
    clearPendingTipTapHtmlSync,
    flushTipTapHtmlSync,
    flushTipTapHtmlSyncBeforeSubmit,
  };
}