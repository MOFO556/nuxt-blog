<script setup lang="ts">
import { z } from 'zod';
import type { SpreadParamsMethod } from '~/types/forms';
import type { User, UserResp } from '~/types/user';

// const login = ref("");
// const password = ref("");

// async function onSubmit(event: any){
//   useNuxtApp()
//   .$api.auth.login(login.value, password.value);
// }

const schema = z.object({
  login: z.string().min(1, 'Login is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})


  const form = useForm(
    {
      login: '',
      password: '',
    },
    undefined,
    () => { navigateTo("/") },
    schema
  );
</script>

<template>
  <UForm :state="form.value"
    :schema="schema"
    @submit.prevent="form.submit(useNuxtApp().$api.auth.login as SpreadParamsMethod<User, UserResp>, { useObjectArgs: false })"
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
        type="password"
        placeholder="••••••••"
        icon="i-heroicons-lock-closed"/>
    </UFormField >

    <UButton type="submit" 
      :loading="form.processing"
      block>Sign In</UButton>
  </UForm>
</template>