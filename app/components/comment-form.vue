<script setup lang="ts">
  import z from 'zod';
  
  const { postId } = defineProps<{ postId: number }>();

  const fileUploadRef = useTemplateRef('fileUploadRef');
  const formRef = useTemplateRef('formRef');
  const showFiles = computed(() => !!form.value.images?.length);
  const descriptions = new WeakMap<File, Ref<string>>();
  const { user } = useUserStore();

  const { $api } = useNuxtApp();

  const schema = z.object({
        text: z.string().optional(),
        postId: z.int().positive().optional(),
        images: z.array(z.instanceof(File)).optional(),
    })
    .refine(
      ({text, images}) => {
          return !!text || !!images?.length
      },
      {
        path: ['text'],
        message: 'Comment is empty: Enter text or attach image!',
      }
    );

  const form = useForm(
    {
      id: undefined,
      postId,
      text: '',
      images: [] as any[],
    },
    "id",
    async (res) => {
      form.value.text = '';
      form.value.images = [];
      await refreshNuxtData(`comments-post${postId}`);
    },
    schema
  );

  const createPathFromFile = (file: File) => {
    return URL.createObjectURL(file);
  };

  function initDescription(files: File[] | null | undefined) {
    form.value.images = files ?? []
    for (const f of form.value.images) 
      getDescription(f);
  };

  function getDescription(f: File) {
    if (!descriptions.has(f)) 
      descriptions.set(f, ref(''))
    return descriptions.get(f)!
  };

  function setFileDescription(file: File) {
    (file as any).description = getDescription(file).value;
  };

  function filesTypeGuard(files: unknown[]): files is File[] {
    return !files?.length || (Array.isArray(files) && files.every(f =>f instanceof File));
  }


</script>

<template>
  <UForm ref="formRef"
    class="flex flex-col gap-2 items-center"
    @submit.prevent="form.submit(
        $api.comments.postToPost, 
        {
          uploadMethod: { 
            images: $api.images.uploadToComment
          }
        }
      )">
    <UContainer class="flex flex-row gap-2 items-center"
      :ui="{ base: 'px-0 sm:px-0 lg:px-0' }">
      <UFormField class="w-full relative"
        :ui="{ error: 'absolute left-0 top-full mt-0.5 text-xs' }"
        :error="form.errors.text || form.errors.images">
          <UTextarea class="w-full"
            v-model="form.value.text"
            :avatar="{
              src:  user?.avatar ? user?.avatar?.startsWith('/') ? `${user.avatar}` : `/${user.avatar}` : '/images/default-avatar.png',
              loading: 'lazy',
              as: { img: 'img' },
              alt: `${user?.login ? user.login : 'User'} icon`
            }"
            :rows="1"
            :autoresize="true"
            :ui="{
              leading: 'items-center',
              trailing: 'items-center'
            }"
            placeholder="Enter the comment..."
            @keydown.ctrl.enter="formRef?.submit()">
            <template #trailing>
              <UContainer class="flex flex-row gap-2">
                <UIcon class="icon-btn" name="i-lucide-image"
                  @click.prevent="fileUploadRef?.inputRef.click()"></UIcon>
                <UIcon class="icon-btn" name="i-lucide-smile"></UIcon>
              </UContainer>
            </template>
          </UTextarea>
      </UFormField>
        <!-- <UIcon class="icon-btn" name="i-lucide-send"></UIcon> -->
        <UButton class="icon-btn"
          type="submit" 
          variant="ghost" 
          icon="i-lucide-send"
          :disabled="!form.value.text && !form.value.images?.length">
        </UButton>
    </UContainer>
    <div 
      v-if="filesTypeGuard(form.value.images)"
      v-show="showFiles">    
      <UFileUpload class="w-full"
        v-model="form.value.images"
        accept="image/jpeg, image/png, image/webp"
        multiple
        placeholder="Select images"
        ref="fileUploadRef"
        @update:model-value="initDescription">

        <template #files="{ files, removeFile }">
          <div class="flex flex-row gap-2 w-full">
            <div v-for="(item, index) in files" :key="index"
              class="flex flex-col items-center justify-center gap-2 w-full relative">
              <div class="relative">
                <img class="p-2 size-50 rounded-xl"
                  :src="createPathFromFile(item)"
                  @click.prevent="preventBubbling"/>
                <UButton class="rounded-full absolute top-0 right-0 size-5 flex items-center justify-center text-sm"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="outline"
                  @click.stop.prevent="removeFile(index)"
                  @mousedown.stop
                  @pointerdown.stop
                />                
              </div>
              <lazy-images-description class="w-50"
                :canEdit="true"
                v-model="getDescription(item).value"
                @update:model-value="setFileDescription(item)"
                @click.prevent="preventBubbling"></lazy-images-description>
            </div>
          </div>
        </template>
      </UFileUpload>
    </div>
  </UForm>
</template>

<style scoped>
.icon-btn:not(:disabled) {
  cursor: pointer;
}
</style>
