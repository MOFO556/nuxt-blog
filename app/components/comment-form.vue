<script setup lang="ts">
import type { Comment } from '~/types/comments'
import type { SpreadParamsMethod } from '~/types/forms';

  const { postId } = defineProps<{ postId?: number }>();

  const fileUploadRef = useTemplateRef('fileUploadRef');
  const formRef = useTemplateRef('formRef');
  const showFiles = computed(() => !!form.value.images?.length);
  const { $api } = useNuxtApp();
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
      console.log(this);
      form.value.text = '';
      form.value.images = [];
      await refreshNuxtData(`comments-post${postId}`);
    }
  );
</script>

<template>
  <UForm ref="formRef"
    class="flex flex-col gap-2 items-center"
    @submit.prevent="form.submit(
        $api.comments.postToPost as SpreadParamsMethod<Comment, Comment>, { 
          useObjectArgs: false,
          uploadMethod: { images: $api.images.uploadToComment }
        }
      )">
    <UContainer class="flex flex-row gap-2 items-center"
      :ui="{ base: 'px-0 sm:px-0 lg:px-0' }">
        <UTextarea class="w-full"
          v-model="form.value.text"
          :avatar="{
            src: 'images/pwa-icon-d05ca427.png',
            loading: 'lazy'
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
        <!-- <UIcon class="icon-btn" name="i-lucide-send"></UIcon> -->
        <UButton class="icon-btn"
          type="submit" 
          variant="ghost" 
          icon="i-lucide-send">
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
.icon-btn {
  cursor: pointer;
}
</style>
