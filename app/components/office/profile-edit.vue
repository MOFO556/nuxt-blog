<script setup lang="ts">
  const { form, isDirty, submit } = useProfileEdit();
</script>

<template>
  <UContainer class="flex flex-col items-center w-full max-w-full">
    <UForm :state="form.value" class="w-full md:w-150" @submit="submit()" >
      <UFormField class="w-full pb-4"
        :error="form.errors.newPassword"
        :ui="{ error: 'absolute left-0 top-full mt-0.5 text-xs' }"
        label="New password"
        name="newPassword">
        <UInput v-model="form.value.newPassword"
          :disabled="form.value.removePassword"
          type="password"
          class="w-full"
          placeholder="Enter new password"/>
      </UFormField>

      <UFormField class="w-full pb-4"
        :error="form.errors.currentPassword"
        :ui="{ error: 'absolute left-0 top-full mt-0.5 text-xs' }"
        label="Current password"
        name="currentPassword">
        <UInput v-model="form.value.currentPassword"
          type="password"
          class="w-full"
          placeholder="Enter current password"/>
      </UFormField>

      <UFormField class="w-full pb-4"
        :error="form.errors.removePassword"
        :ui="{ error: 'absolute -left-15 top-full mt-0.5 text-xs' }"
        orientation="horizontal"
        label="Delete password"
        name="removePassword">
        <USwitch class="w-full"
          v-model="form.value.removePassword" 
          @change="form.value.newPassword ? form.value.newPassword = '' : undefined"/>
      </UFormField>

      <UButton class="mt-2 button-base-cover"
        type="submit" 
        :loading="form.processing" 
        :disabled="!isDirty"
        :ui="{
          base: 'disabled:opacity-50 disabled:bg-[var(--ui-bg-muted)]'
        }"
        variant="outline"
        :color="!isDirty ? 'neutral' : 'primary'"
        icon="i-lucide-save">Save</UButton>
    </UForm>
  </UContainer>
</template>