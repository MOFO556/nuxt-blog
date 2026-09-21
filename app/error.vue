<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError
})

const isDev = import.meta.dev;

</script>

<template>
  <div v-if="error?.status == 404">
    <h1>Страница не найдена</h1>
    <NuxtLink to="/">Начните с главной</NuxtLink>
  </div>
  <div v-else>
    Временная ошибка системы, не скучайте, ремонтируем
  </div>
  <pre v-if="isDev">
    {{ JSON.stringify(error, null, 2) }}
  </pre>
</template>