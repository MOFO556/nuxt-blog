<script setup lang="ts">
import type { Comment } from '~/types/comments'
import type { SpreadParamsMethod } from '~/types/forms';
import z from 'zod';

  const { postId } = defineProps<{ postId: number }>();

  const fileUploadRef = useTemplateRef('fileUploadRef');
  const formRef = useTemplateRef('formRef');
  const showFiles = computed(() => !!form.value.images?.length);
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
      postId,
      text: '',
      images: [],
      id: ''
    },
    "id",
    async (res) => {
      //TODO: Add sockets
      form.value.text = '';
      form.value.images = [];
      await refreshNuxtData(`comments-post${postId}`);
    },
    schema
  );

          // :avatar="{
          //   src: 'images/pwa-icon-d05ca427.png',
          //   loading: 'lazy'
          // }"

</script>

<template>
  <UForm ref="formRef"
    class="flex flex-col gap-2 items-center"
    @submit.prevent="form.submit(
        $api.comments.postToPost, 
        {
          uploadMethod: { images: $api.images.uploadToComment }
        }
      )">
    <UContainer class="flex flex-row gap-2 items-center"
      :ui="{ base: 'px-0 sm:px-0 lg:px-0' }">
      <UFormField class="w-full relative"
        :ui="{ error: 'absolute left-0 top-full mt-0.5 text-xs' }"
        :error="form.errors.text || form.errors.images">
          <UTextarea class="w-full"
            v-model="form.value.text"
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
    <div v-show="showFiles">
      <UFileUpload class="w-full" 
        v-model="form.value.images"
        :ui="{
          file: 'h-50'
        }"
        size="xs"
        ref="fileUploadRef"
        accept="image/jpeg, image/png, image/webp"
        multiple></UFileUpload> 
    </div>
  </UForm>
</template>

<style scoped>
.icon-btn:not(:disabled) {
  cursor: pointer;
}
</style>
