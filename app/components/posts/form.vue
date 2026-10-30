<script setup lang="ts">
  import type { PostImageMeta, Tag } from '~/types/posts';
  import type { PostMode as PostModeType } from '~~/shared/types/posts';
  import { usePostFormAssistantBridge } from '~/composables/usePostFormAssistantBridge';

  const props = withDefaults(defineProps<{
    url?: string,
    title?: string,
    content?: string,
    contentHtml?: string | null,
    description?: string | null,
    mode?: PostModeType,
    images?: PostImageMeta[],
    id?: number,
    tags?: Tag[],
    wide?: boolean,
  }>(), {
    wide: false,
  });

  const formClass = computed(() =>
    props.wide
      ? 'w-full max-w-3xl mx-auto p-4 sm:p-6 space-y-4'
      : 'max-w-xl mx-auto p-6 space-y-4',
  );

  const {
    form,
    id,
    modeLocked,
    modeItems,
    isFormatted,
    coverModel,
    coverIndex,
    editorRef,
    imagePreviewModal,
    allTags,
    onModalClose,
    imageDblClick,
    setCover,
    removeFileAt,
    onInsertImageRequest,
    onInsertCarouselRequest,
    submitForm,
    onCreateTag,
  } = await usePostForm(props);

  const { submitPostForm } = usePostFormAssistantBridge({
    form,
    editorRef,
    isFormatted,
    allTags,
    submitForm,
  });
</script>

<template>  
  <UForm :class="formClass"
    :state="form.value"
    @submit.prevent="submitPostForm">
    <UFormField
      v-if="!modeLocked"
      class="w-full relative pb-2"
      label="Mode"
      name="mode">
      <URadioGroup class="mode-toggle" 
        v-model="form.value.mode"
        :items="modeItems"
        value-key="value"
        label-key="label"
        orientation="horizontal"/>
    </UFormField>

    <UFormField  class="w-full relative pb-2"
      label="Title" 
      name="title"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.title">
      <UInput class="w-full"
        v-model="form.value.title" 
        type="text"
        placeholder="Enter title"/>
    </UFormField >

    <UFormField
      class="w-full relative pb-2"
      label="Description"
      name="description">
      <UInput
        class="w-full"
        v-model="form.value.description"
        type="text"
        placeholder="Optional list preview"/>
    </UFormField>

    <UFormField class="w-full relative pb-2"
      label="Content" 
      name="content"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.content">
      <posts-editor v-if="isFormatted"
        ref="editorRef"
        v-model:content="form.value.content"
        v-model:content-html="form.value.contentHtml"
        @insert-image-request="onInsertImageRequest"
        @insert-carousel-request="onInsertCarouselRequest"/>
      <UTextarea v-else class="w-full legacy-content"
        v-model="form.value.content" 
        type="text"
        placeholder="Enter content"
        :minrows="3"
        :maxrows="5"
        :autoresize="true"
        :ui="{
          base: 'resize-none'
        }"/>
    </UFormField >

    <UFormField class="w-full relative pb-2"
      label="Url" 
      name="url"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.url">
      <UInput class="w-full"
        v-model="form.value.url" 
        type="text"
        placeholder="Enter url"/>
    </UFormField >

    <UFormField class="w-full"
      label="Tags">
      <USelectMenu class="w-full"
        v-model="form.value.tags"
        :items="allTags"
        label-key="name"
        create-item
        @create="onCreateTag"
        multiple
        searchable
        placeholder="Pick or type new tags"/>
    </UFormField>

    <UFormField v-if="isFormatted" class="w-full relative pb-2"
      label="Cover"
      name="cover">
      <UFileUpload class="w-full"
        v-model="coverModel"
        accept="image/jpeg, image/png, image/webp"
        placeholder="Select cover image"/>
    </UFormField>

    <UFormField
      v-else
      class="w-full relative pb-2"
      label="Images" 
      name="images"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.images">
      <UFileUpload class="w-full"
        v-model="form.value.images"
        accept="image/jpeg, image/png, image/webp"
        multiple
        placeholder="Select images"
        :ui="{ files: 'grid grid-cols-11 md:grid-cols-1 gap-2 w-full'}">

        <template #files="{ files, removeFile }">
          <div class="flex flex-col gap-2 w-full">
            <div v-for="(item, index) in files" :key="index"
              class="flex items-center justify-end gap-2 w-full">
              <label :for="`pick-cover-${index}`" class="no-text-selection"
                @dblclick.prevent="imageDblClick($event, item)"
                @click.prevent="preventBubbling">
                {{ item.name }}
              </label>
              <UCheckbox :id="`pick-cover-${index}`"
                label="Cover"
                :model-value="coverIndex === index"
                @update:model-value="(checked: boolean | 'indeterminate') => setCover(index, checked)"
                @click.stop.prevent
                @mousedown.stop
                @pointerdown.stop/>
              <UButton
                icon="i-lucide-trash"
                @click.stop.prevent="removeFileAt(index, removeFile)"
                @mousedown.stop
                @pointerdown.stop/>
            </div>
          </div>
        </template>                
      </UFileUpload>
      <UModal v-model:open="imagePreviewModal.open"
          :ui="{
            header: 'sm:py-0 sm:px-3 min-h-[2rem] border-none justify-end',
            body: 'px-2 pt-0 pb-4 sm:px-4 sm:pt-0 sm:pb-4',
            close: 'top-2 end-2'
          }"
          @after:leave="onModalClose">
        <template #body>
          <images-view :imgSrc="imagePreviewModal.picture"
            :canEditDescription="true"
            :noProvider="true"
            :description="imagePreviewModal.description"
            @descriptionChanged="imagePreviewModal.description = $event"></images-view>
        </template>
      </UModal>

    </UFormField>

    <UButton type="submit" block
      :loading="form.processing">
      {{ id ? 'Edit' : 'Create' }}
    </UButton>
  </UForm>
</template>

<style scoped>
  .error {
    display: block;
    color: red;
    margin: 5px 0;
  }
</style>
