<script setup lang="ts">
  import { z } from 'zod';
  import type { User, UserResp } from '~/types/user';

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

  const form = useForm(
    {
      login: '',
      password: '',
      usePasskey: false
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
      form.value.usePasskey 
        ? $api.auth.loginPassKey
        : $api.auth.login
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
        icon="i-heroicons-user"/>
    </UFormField >

    <UFormField class="w-full relative pb-2"
      label="Password" 
      name="password"
      :ui="{ error: 'absolute left-0 top-full mt-1 text-xs' }"
      :error="form.errors.password">
      <UInput class="w-full"
        v-model="form.value.password" 
        :disabled="form.value.usePasskey"
        type="password"
        placeholder="••••••••"
        icon="i-heroicons-lock-closed"/>
    </UFormField >

    <USwitch v-model="form.value.usePasskey"
      label="Log in without password" />

    <UButton type="submit" 
      :loading="form.processing"
      block>Sign In</UButton>

    <pre class="flex justify-between">Don't have an account? <b>-</b> <NuxtLink class="text-primary" :to="{name: 'auth-register'}">Sign up</NuxtLink></pre>
  </UForm>
</template>