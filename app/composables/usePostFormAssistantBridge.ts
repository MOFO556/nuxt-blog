import type { Ref } from 'vue';
import type {
  AssistantFormBridgeApi,
  AssistantRemoteImageInput,
} from '~/types/assistant';
import type {
  PostEditorExpose,
  PostFormData,
  Tag,
} from '~/types/posts';
import type {
  AssistantFormPatch,
  AssistantFormSnapshot,
} from '~~/shared/types/assistant';
import { PostMode } from '~~/shared/types/posts';
import {
  provideAssistantFormBridge,
  snapshotFromPostForm,
} from '~/composables/useAssistantFormBridge';
import { usePendingTipTapHtmlSync } from '~/composables/usePendingTipTapHtmlSync';
import { normalizeFormPatchForMode } from '~~/shared/assistant/normalizeFormPatch';
import { placeCarouselImagesInHtml } from '~~/shared/assistant/carouselSlots';
import { newClientTempId, toStagedUploadFile } from '~/utils/postUploadIds';
import {
  appendInlineImageInHtml,
  carouselSlotOrDefault,
  fetchRemoteImageAsFile,
  groupCarouselSlotEntries,
  prependInlineImageInHtml,
  remoteImageCaption,
  resolvePatchTags,
  shouldPlaceRemoteImageInBody,
} from '~/utils/postFormAssistant';

type PostFormState = {
  value: PostFormData;
};

export type UsePostFormAssistantBridgeArgs = {
  form: PostFormState;
  editorRef: Ref<PostEditorExpose | null>;
  isFormatted: Ref<boolean>;
  allTags: Ref<Tag[]>;
  submitForm: () => void;
};

export function usePostFormAssistantBridge({
  form,
  editorRef,
  isFormatted,
  allTags,
  submitForm,
}: UsePostFormAssistantBridgeArgs) {
  const formBridgeApi = shallowRef<AssistantFormBridgeApi | null>(null);
  const formSnapshot = shallowRef<AssistantFormSnapshot | null>(null);
  provideAssistantFormBridge(formBridgeApi, formSnapshot);

  const {
    markTipTapHtmlSyncNeeded,
    clearPendingTipTapHtmlSync,
    flushTipTapHtmlSyncBeforeSubmit,
  } = usePendingTipTapHtmlSync(
    editorRef,
    () => form.value.contentHtml || '',
    (content) => {
      form.value.content = content;
    },
  );

  watch(isFormatted, (formatted) => {
    if (!formatted)
      clearPendingTipTapHtmlSync();
  });

  function currentSnapshot() {
    return snapshotFromPostForm({
      mode: form.value.mode,
      title: form.value.title,
      description: form.value.description,
      url: form.value.url,
      content: form.value.content,
      contentHtml: form.value.contentHtml,
      tags: form.value.tags,
    });
  }

  function applyCarouselSlotsToForm(
    slots: { slot: string; imageIds: (string | number)[] }[],
  ) {
    if (!slots.length || !isFormatted.value)
      return;

    if (editorRef.value) {
      editorRef.value.fillCarouselSlots(slots);
      // fillCarouselSlots can update HTML without TipTap; JSON stays stale then.
      if (!editorRef.value.editor)
        markTipTapHtmlSyncNeeded();
      return;
    }

    form.value.contentHtml = placeCarouselImagesInHtml(
      form.value.contentHtml || '',
      slots,
    );
    markTipTapHtmlSyncNeeded();
  }

  function placeInlineImageInForm(
    placement: 'prepend' | 'append',
    previewUrl: string,
    tempId: string,
  ) {
    if (editorRef.value?.editor) {
      if (placement === 'prepend')
        editorRef.value.prependImage(previewUrl, tempId);
      else
        editorRef.value.insertImageAtCursor(previewUrl, tempId);
      return;
    }

    form.value.contentHtml = placement === 'prepend'
      ? prependInlineImageInHtml(form.value.contentHtml || '', previewUrl, tempId)
      : appendInlineImageInHtml(form.value.contentHtml || '', previewUrl, tempId);
    markTipTapHtmlSyncNeeded();
  }

  function applyPatch(patch: AssistantFormPatch) {
    const normalized = normalizeFormPatchForMode(form.value.mode, patch);
    if (normalized.title !== undefined)
      form.value.title = normalized.title;
    if (normalized.description !== undefined)
      form.value.description = normalized.description;
    if (normalized.url !== undefined)
      form.value.url = normalized.url;
    if (normalized.tags !== undefined)
      form.value.tags = resolvePatchTags(normalized.tags, allTags.value);

    if (form.value.mode === PostMode.Formatted) {
      if (normalized.contentHtml !== undefined) {
        form.value.contentHtml = normalized.contentHtml;
        const synced = editorRef.value?.setHtmlContent(
          normalized.contentHtml,
          { lockAuthored: true },
        ) === true;
        if (!synced) {
          if (normalized.content !== undefined)
            form.value.content = normalized.content;
          markTipTapHtmlSyncNeeded();
        }
      }
      else if (normalized.content !== undefined) {
        form.value.content = normalized.content;
      }
    }
    else if (normalized.content !== undefined) {
      form.value.content = normalized.content;
    }

    formSnapshot.value = currentSnapshot();
  }

  async function stageOneRemoteImage(
    image: AssistantRemoteImageInput,
    options: { deferCarousel?: boolean } = {},
  ): Promise<string | null> {
    const file = await fetchRemoteImageAsFile(image.regularUrl);
    const caption = remoteImageCaption(image);
    const tempId = newClientTempId();
    const previewUrl = URL.createObjectURL(file);
    const staged = toStagedUploadFile(file, {
      clientTempId: tempId,
      previewUrl,
      description: caption || undefined,
      postCover: !!image.asCover,
    });

    if (!isFormatted.value) {
      form.value.images = [...form.value.images, staged];
      return tempId;
    }

    if (image.asCover)
      form.value.cover = [staged];

    if (shouldPlaceRemoteImageInBody(image))
      form.value.contentImages = [...form.value.contentImages, staged];

    if (image.forCarousel) {
      if (!options.deferCarousel) {
        applyCarouselSlotsToForm([{
          slot: carouselSlotOrDefault(image.carouselSlot),
          imageIds: [tempId],
        }]);
      }
      return tempId;
    }

    if (image.alsoInContent)
      placeInlineImageInForm('prepend', previewUrl, tempId);
    else if (!image.asCover)
      placeInlineImageInForm('append', previewUrl, tempId);

    return tempId;
  }

  async function stageRemoteImages(images: AssistantRemoteImageInput[]) {
    const slotted: { slot: string; id: string }[] = [];

    for (const image of images) {
      const tempId = await stageOneRemoteImage(image, { deferCarousel: true });
      if (!tempId || !image.forCarousel)
        continue;
      slotted.push({
        slot: carouselSlotOrDefault(image.carouselSlot),
        id: tempId,
      });
    }

    if (!isFormatted.value || !slotted.length)
      return;

    applyCarouselSlotsToForm(groupCarouselSlotEntries(slotted));
  }

  formBridgeApi.value = {
    getSnapshot: () => {
      if (!formSnapshot.value)
        throw new Error('Post form bridge is not ready');
      return formSnapshot.value;
    },
    applyPatch,
    stageRemoteImage: async (image) => {
      await stageOneRemoteImage(image);
    },
    stageRemoteImages,
  };

  watch(
    () => currentSnapshot(),
    (snapshot) => {
      formSnapshot.value = formBridgeApi.value ? snapshot : null;
    },
    { deep: true, immediate: true },
  );

  async function submitPostForm() {
    if (isFormatted.value)
      await flushTipTapHtmlSyncBeforeSubmit();
    submitForm();
  }

  return {
    submitPostForm,
  };
}