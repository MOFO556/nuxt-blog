<script setup lang="ts">
  import { z } from 'zod';
  import type { UserFormData, UserResp } from '~/types/user';
  
  useHead({
    title: 'Register',
    meta: [
      { name: 'description', content: 'Register in the app' },
    ]
  })

  definePageMeta({
    guest: true
  });

  const { $api } = useNuxtApp();
  const schema = z.object({
    login: z.string().min(1, 'Login is required'),
    password: z.string().optional().default(''),
    usePasskey: z.boolean().default(false)
  }).superRefine(({ password, usePasskey }, ctx) => {
    const hasPassword = password.length > 0;
    if (!hasPassword && !usePasskey) {
      ctx.addIssue({
        code: "custom",
        path: ['password'],
        message: 'Enter a password or enable passkey',
      });
    }
    if (hasPassword && password.length < 6) {
      ctx.addIssue({
        code: "custom",
        path: ['password'],
        message: 'Password must be at least 6 characters',
      });
    }
  });

  const form = useForm<UserFormData, UserResp>(
    {
      login: '',
      password: '',
      usePassKey: false,
      avatar: undefined
    },
    undefined,
    () => { navigateTo("/") },
    schema
  );
</script>

<template>
  <UForm :state="form.value"
    :schema="schema"
    @submit.prevent="form.submit(
      form.value.usePassKey 
        ? $api.auth.registerPassKey
        : $api.auth.register, 
      { 
        uploadMethod: {
          avatar: $api.images.uploadAvatar
        }
      }
    )"
    class="max-w-md mx-auto p-6 space-y-4">
    <UFormField  class="w-full relative pb-2"
      label="Login" 
      name="login"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.login">
      <UInput class="w-full"
        v-model="form.value.login" 
        type="text"
        placeholder="Enter login"
        icon="i-lucide-user"/>
    </UFormField >

    <UFormField class="w-full relative pb-2"
      label="Password" 
      name="password"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.password">
      <UInput class="w-full"
        v-model="form.value.password" 
        type="password"
        placeholder="••••••••"
        icon="i-lucide-lock"/>
    </UFormField >

    <UFormField class="w-full relative pb-2"
      label="Do you want to use passwordless auth?" 
      name="usePasskey"
      orientation="horizontal"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.usePasskey">
      <UCheckbox class="w-full"
        v-model="form.value.usePassKey" />
    </UFormField >

    <UFormField class="w-full relative pb-4 mb-2"
      :ui="{ error: 'absolute left-0 bottom-0 text-xs mt-0' }"
      :error="form.errors.avatar">
      <UFileUpload 
          v-model="form.value.avatar"
          icon="i-lucide-file-user"
          label="Select avatar picture"
          accept="image/jpeg, image/png, image/webp">
      </UFileUpload>
    </UFormField >


    <UButton type="submit" 
      :loading="form.processing"
      block>Sign Up</UButton>

    <pre class="flex justify-between">Already have an account? <b>-</b> <NuxtLink class="text-primary" :to="{name: 'auth-login'}">Sign in</NuxtLink></pre>
  </UForm>
</template>