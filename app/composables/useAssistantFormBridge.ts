import {
  computed,
  onBeforeUnmount,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import type {
  AssistantFormBridgeApi
} from '~/types/assistant';
import { PostMode } from '~~/shared/types/posts';

const formBridgeRef = shallowRef<AssistantFormBridgeApi | null>(null);

export function provideAssistantFormBridge(
  api: MaybeRefOrGetter<AssistantFormBridgeApi | null>,
  snapshot?: MaybeRefOrGetter<AssistantFormSnapshot | null | undefined>,
) {
  const store = useAssistantStore();
  const resolved = computed(() => toValue(api));

  const bridge: AssistantFormBridgeApi = {
    getSnapshot: () => {
      const current = resolved.value;
      if (!current)
        throw new Error('Post form bridge is not ready');
      return current.getSnapshot();
    },
    applyPatch: (patch) => {
      resolved.value?.applyPatch(patch);
    },
    stageRemoteImage: async (image) => {
      const current = resolved.value;
      if (!current)
        throw new Error('Post form bridge is not ready');
      await current.stageRemoteImage(image);
    },
    stageRemoteImages: async (images) => {
      const current = resolved.value;
      if (!current)
        throw new Error('Post form bridge is not ready');
      await current.stageRemoteImages(images);
    },
  };

  watch(
    resolved,
    (current) => {
      formBridgeRef.value = current ? bridge : null;
      if (!current && snapshot === undefined)
        store.setFormSnapshot(null);
    },
    { immediate: true },
  );

  watch(
    () => {
      if (snapshot !== undefined)
        return toValue(snapshot) ?? null;
      const current = resolved.value;
      return current ? current.getSnapshot() : null;
    },
    (next) => {
      store.setFormSnapshot(next);
    },
    { deep: true, immediate: true },
  );

  onBeforeUnmount(() => {
    if (formBridgeRef.value === bridge)
      formBridgeRef.value = null;
    store.setFormSnapshot(null);
  });
}

export function useAssistantFormBridge(): Ref<AssistantFormBridgeApi | null> {
  return formBridgeRef;
}

export function snapshotFromPostForm(form: {
  mode: PostMode | string;
  title: string;
  description?: string;
  url: string;
  content: string;
  contentHtml?: string;
  tags?: ({ name: string } | string)[];
}): AssistantFormSnapshot {
  return {
    mode: form.mode === PostMode.Formatted ? PostMode.Formatted : PostMode.Legacy,
    title: form.title,
    description: form.description ?? '',
    url: form.url,
    content: form.content,
    contentHtml: form.contentHtml ?? '',
    tags: (form.tags ?? []).map((t) => (typeof t === 'string' ? t : t.name)),
  };
}