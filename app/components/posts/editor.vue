<script setup lang="ts">
  import { CarouselExtension } from '~/utils/carouselExtension';
  import { HtmlDivExtension } from '~/utils/htmlDivExtension';
  import { PostImageExtension } from '~/utils/postImageExtension';
  import {
    styledHtmlNodeExtensions,
    styledStarterKitOptions,
  } from '~/utils/styledHtmlNodes';

  const contentJson = defineModel<string>('content', { required: true });
  const contentHtml = defineModel<string>('contentHtml', { required: true });

  const emit = defineEmits<{
    insertImageRequest: [];
    insertCarouselRequest: [];
  }>();

  const {
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
  } = usePostEditor(contentJson, contentHtml, emit);

  defineExpose({
    insertImageAtCursor,
    insertCarousel,
    editor: computed(() => editorRef.value?.editor),
  });
</script>

<template>
  <div class="formatted-editor space-y-2 border border-default rounded-md p-2">
    <div v-show="!showSource">
      <UEditor ref="editorRef"
        v-model="htmlModel"
        content-type="html"
        :image="false"
        :mention="false"
        :starter-kit="styledStarterKitOptions"
        :editor-props="editorProps"
        placeholder="Write your post…"
        :extensions="[
          HtmlDivExtension, ...styledHtmlNodeExtensions, PostImageExtension, CarouselExtension
        ]"
        class="w-full min-h-40"
        @update:model-value="syncJsonFromEditor">
        <template #default="{ editor, handlers }">
          <UEditorToolbar class="mb-2 flex flex-wrap gap-1"
            :editor="editor"
            :handlers="handlers"
            :items="toolbarItems"/>
        </template>
      </UEditor>
      <p v-if="lockAuthoredHtml"
        class="text-xs text-muted mt-1">
        Custom HTML is locked as the saved source. Editing in visual mode will replace it with TipTap’s HTML.
      </p>
    </div>
    <template v-if="showSource">
      <UTextarea class="w-full font-mono text-xs"
        v-model="sourceHtml"
        :rows="12"/>
      <p class="text-xs text-muted">
        Tip: use valid CSS without quotes around values, e.g. <code>style="color: red"</code> not <code>color: 'red'</code>.
      </p>
      <div class="flex justify-end">
        <UButton size="xs" type="button" @click="applySourceHtml">Apply HTML</UButton>
      </div>
    </template>
  </div>
</template>

<style>
  div[data-carousel] {
    border: 1px dashed var(--ui-border);
    border-radius: 0.5rem;
    padding: 0.75rem;
    margin: 0.5rem 0;
    min-height: 2.5rem;
  }
  div[data-carousel]::before {
    content: 'Carousel: ' attr(data-image-ids);
    font-size: 0.75rem;
    opacity: 0.8;
  }
</style>