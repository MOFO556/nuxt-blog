<script setup lang="ts">
  const open = defineModel<boolean>('open', { default: false });
  const route = useRoute();
  const router = useRouter();
  const { $api } = useNuxtApp();

  const { data: allTags } = await useAsyncData('all-tags', $api.tags.all, {
    default: () => [] as { name: string; slug: string }[],
  });

  const form = reactive({
    q: '', from: '', to: '', author: '',
    tags: [] as string[],
  });

  function syncFromRoute() {
    form.q = (route.query.q as string) ?? '';
    form.from = (route.query.from as string) ?? '';
    form.to = (route.query.to as string) ?? '';
    form.author = (route.query.author as string) ?? '';
    form.tags = String(route.query.tags ?? '').split(',').filter(Boolean);
  }
  watch(() => route.query, syncFromRoute, { immediate: true, deep: true });

  function apply() {
    const query: Record<string, string> = {};
    if (form.q)
      query.q = form.q;
    if (form.from)
      query.from = form.from;
    if (form.to)
      query.to = form.to;
    if (form.author)
      query.author = form.author;
    if (form.tags.length)
      query.tags = form.tags.join(',');

    router.push({ query });
    open.value = false;
  }

  function reset() {
    Object.assign(form, { q: '', from: '', to: '', author: '', tags: [] });
    router.push({ query: {} });
    open.value = false;
  }
</script>

<template>
  <USlideover v-model:open="open" side="right" title="Filters">
    <template #body>
      <div class="flex flex-col gap-4 w-full">
        <LazyUFormField class="w-full" 
          label="Title / text">
          <LazyUInput class="w-full"
            v-model="form.q"
            placeholder="Search…" />
        </LazyUFormField>

        <LazyUFormField class="w-full"
          label="Created after">
          <LazyUInput class="w-full"
            v-model="form.from" 
            type="date" />
        </LazyUFormField>

        <LazyUFormField class="w-full"
          label="Created before">
          <LazyUInput class="w-full"
            v-model="form.to"
            type="date" />
        </LazyUFormField>

        <LazyUFormField class="w-full"
          label="Author">
          <LazyUInput class="w-full"
            v-model="form.author"
            placeholder="e.g. jane" />
        </LazyUFormField>

        <LazyUFormField class="w-full"
          label="Tags">
          <LazyUSelectMenu class="w-full"
            v-model="form.tags"
            :items="allTags ?? []"
            value-key="slug"
            label-key="name"
            multiple
            searchable
            placeholder="Pick or type new tags" />
        </LazyUFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="reset">Reset all</UButton>
        <UButton color="primary" variant="outline" @click="apply">Apply</UButton>
      </div>
    </template>
  </USlideover>
</template>