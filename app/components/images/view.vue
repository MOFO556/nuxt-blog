<script setup lang="ts">
const { imgSrc, noProvider = false, description, canEditDescription = false } = defineProps<{ 
    imgSrc?: string; 
    noProvider?: boolean;
    description?: string;
    canEditDescription: boolean
  }>();
  const descriptionModel = ref(description);
const emit = defineEmits(['descriptionChanged', 'descriptionEditStopped']);
function descriptionChanged() {
  emit('descriptionChanged', descriptionModel.value);
}
const throttleFunc = throttle(descriptionChanged, 75);
</script>

<template>
  <UContainer>
    <img v-if="noProvider"
      class="p-4"
      :src="imgSrc"/>
    <NuxtImg v-else
      class="p-4"
      :src="imgSrc"></NuxtImg>
    <images-description :canEdit="canEditDescription"
      v-model="descriptionModel" 
      @update:model-value="throttleFunc()"
      @editStopped="emit('descriptionEditStopped', $event)"></images-description>
    <!-- <comment-form></comment-form> -->
  </UContainer>
</template>