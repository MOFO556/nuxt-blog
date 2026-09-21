<script setup lang="ts">
import { z } from 'zod';
import type { UploadItem } from '~/types/core';
import type { Post, PostImage } from '~/types/posts';

const { title = '', content = '', url = '', images = null, id } = defineProps<{
      url?: string,
      title?: string,
      content?: string,
      images?: any[],
      id?: number
    }>();
const coverIndex = ref<number | null>(null);
    
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  url: z.string().min(1, 'URL is required'),
  images: z.array(z.object().nullable()).nullable()
});

const form = useForm(
  {
    title: title,
    content: content,
    url: url,
    images: images,
    ...(id ? { id }: {})
  },
  "id",
  async (res: Post) => {
    if (id) {
      await refreshNuxtData(`office-post${id}`);
      navigateTo({ name: `office-posts-id`, params: { id }});      
    }
    else
      navigateTo({ name: "posts-id", ...(res?.id ? { params: {id: res.id } } : {} )})
  },
  schema
);

function preventBubbling(event: MouseEvent) {
  event.stopPropagation();
};

function setCover(index: number, checked: boolean| "indeterminate", item: File & { isCover?: boolean }) {
  if (checked)
    coverIndex.value = index;
  else if (coverIndex.value === index)
    coverIndex.value = null;
}

function removeFileAt(index: number, removeFile: (i: number) => void) {
  removeFile(index);
  if (coverIndex.value === null) 
    return;
  if (coverIndex.value === index) 
    coverIndex.value = null;
  else if (coverIndex.value > index) 
    coverIndex.value--;
}

function setSelectedCover() {
  if (form.value.images === null
    || coverIndex.value === null)
    return;
  else
    form.value.images?.map((img: File & { isCover?: boolean }, index: number) => {
      img.isCover = index === coverIndex.value;
      return img;
    })
}

async function loadExistingFiles(urls: PostImage[]) {
  const files = await Promise.all(
    urls.map(async (u) => {
      const url = typeof u === 'string' ? u : u.path;
      const isCover = typeof u === 'string' ? false : !!u.postCover;

      const file = await urlToFile(url);
      (file as any).existingPath = url;
      (file as any).isCover = isCover;
      return <UploadItem>file;
    })
  );

  form.value.images = files;

  const coverIdx = files.findIndex((f: UploadItem) => f.isCover);
  coverIndex.value = coverIdx >= 0 ? coverIdx : null;
}

onMounted(() => {
  if (images?.length) 
    loadExistingFiles(images);
});

</script>

<template>  
  <UForm :state="form.value"
    :schema="schema"
    @submit.prevent="setSelectedCover(); form.submit(
        id ? useNuxtApp().$api.posts.edit : useNuxtApp().$api.posts.add,
        { uploadMethod: { images: useNuxtApp().$api.images.uploadToPost } }
      )"
    class="max-w-md mx-auto p-6 space-y-4">
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

    <UFormField class="w-full relative pb-2"
      label="Content" 
      name="content"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.content">
      <UTextarea class="w-full"
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

    <UFormField class="w-full relative pb-2"
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
                @click="preventBubbling">{{ item.name }}</label>
              <UCheckbox :id="`pick-cover-${index}`"
                label="Cover"
                :model-value="coverIndex === index"
                @update:model-value="(checked: boolean| 'indeterminate') => setCover(index, checked, item)"
                @click.stop.prevent
                @mousedown.stop
                @pointerdown.stop
              />
              <UButton
                icon="i-lucide-trash"
                @click.stop.prevent="removeFileAt(index, removeFile)"
                @mousedown.stop
                @pointerdown.stop
              />
            </div>
          </div>
        </template>
                
      </UFileUpload>

    </UFormField>

    <UButton type="submit" 
      :loading="form.processing"
      block>{{id ? 'Edit' : 'Create'}}</UButton>
  </UForm>
</template>

<style scoped>
.error {
  display: block;
  color: red;
  margin: 5px 0;
}
</style>