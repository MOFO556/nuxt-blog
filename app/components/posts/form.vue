<script setup lang="ts">
  import { z } from 'zod';
  import type { UploadMethodResultItem } from '~/types/forms';
  import type { Post, PostImageMeta, PostItemUploadMeta, Tag } from '~/types/posts';

  const { title = '', content = '', url = '', images, tags = [], id } = defineProps<{
        url?: string,
        title?: string,
        content?: string,
        images?: PostImageMeta[],
        id?: number
        tags?: Tag[]
      }>();
  const { $api } = useNuxtApp();
  const coverIndex = ref<number | null>(null);
  const imagePreviewModal = reactive<{
        open: boolean;
        picture?: string;
        description?: string;
        file?: File & { description?: string }
    }>({
      open: false,
      picture: undefined,
      description: undefined,
      file: undefined
    });

  const { data: fetchedTags } = await useAsyncData(`all-tags-on-post-${id}-edit`, $api.tags.all, {
    default: () => [] as { name: string; slug: string }[],
  });

  const allTags = ref<Tag[]>((fetchedTags.value ?? []));

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

  const onModalToOpen = (file: File & { description?: string }, path: string) => {
    imagePreviewModal.open = true;
    imagePreviewModal.picture = path;
    imagePreviewModal.file = file;
    imagePreviewModal.description = file.description;
  }

  const onModalClose = () => {
    if (!!imagePreviewModal.file)
      imagePreviewModal.file.description = imagePreviewModal.description;
    imagePreviewModal.description = undefined;
    imagePreviewModal.picture = undefined;
    imagePreviewModal.file = undefined;
  }
      
  const schema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    url: z.string().min(1, 'URL is required'),
    images: z.array(z.instanceof(Object)).optional()
  });

  const form = useForm(
    {
      title: title,
      content: content,
      url: url,
      images: [] as File[],
      tags: tags,
      ...(id ? { id }: {})
    },
    "id",
    async (res: Post) => {
      if (id) {
        await refreshNuxtData(`office-post-${id}`);
        return;
      }
      if (res?.id)
        await navigateTo(`/office/posts/${res.id}`);
    },
    schema
  );

  function imageDblClick(event: MouseEvent, file: File) {
    preventBubbling(event);
  const currentObjectUrl = URL.createObjectURL(file);
    onModalToOpen(file, currentObjectUrl);
  }

  function setCover(index: number, checked: boolean| "indeterminate", item: File & { postCover?: boolean }) {
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
      form.value.images?.map((img: File & { postCover?: boolean }, index: number) => {
        img.postCover = index === coverIndex.value;
        return img;
      })
  }

  async function loadExistingFiles(urls: PostImageMeta[]) {
    const files = await Promise.all(
      urls.map(async (u) => {
        const url = typeof u === 'string' ? u : u.path;
        const postCover = typeof u === 'string' ? false : !!u.postCover;

        const file = await urlToFile(url);
        (file as any).existingPath = url;
        (file as any).originalName = u.name;
        (file as any).description = u.description;
        (file as any).postCover = postCover;
        return <PostItemUploadMeta>file;
      })
    );

    form.value.images = files;

    const coverIdx = files.findIndex((f: PostItemUploadMeta) => f.postCover);
    coverIndex.value = coverIdx >= 0 ? coverIdx : null;
  }

  onMounted(() => {
    if (images?.length) 
      loadExistingFiles(images);
  });

  function updatePathsOnUpload(paths: Record<string, UploadMethodResultItem[]>) {
    Object.keys(paths)
      .forEach(async formKey => {
        if (paths[formKey])
          await loadExistingFiles(paths[formKey]);
      })
  }
</script>

<template>  
  <UForm :state="form.value"
    :schema="schema"
    @submit.prevent="setSelectedCover(); form.submit(
        id ? $api.posts.edit : $api.posts.add,
        { 
          uploadMethod: { images: $api.images.uploadToPost },          
          onUploadSucseed: (e) => updatePathsOnUpload(e)
        }
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

    <UFormField class="w-full"
      label="Tags">
      <USelectMenu class="w-full"
        v-model="form.value.tags"
        :items="allTags"
        label-key="name"
        create-item
        @create="(query: string) => {
          const name = query.trim();
          allTags.push({ name, slug: slugify(name) })
          form.value.tags.push({ name, slug: slugify(name) });
        }"
        multiple
        searchable
        placeholder="Pick or type new tags"/>
    </UFormField>

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
                @dblclick.prevent="imageDblClick($event, item)"
                @click.prevent="preventBubbling">
                {{ item.name }}
              </label>
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