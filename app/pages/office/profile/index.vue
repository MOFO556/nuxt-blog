<script setup lang="ts">
  import type { TabsItem } from '@nuxt/ui';

  const { user, loggedIn } = useUserStore();
  const route = useRoute();
  const router = useRouter();

  const profileEdit = useProfileEditForm();
  provide(PROFILE_EDIT_KEY, profileEdit);

  const tabs = ref<TabsItem[]>([
    { label: 'Update profile data', value: 'profile-edit', slot: 'profile' as const },
    { label: `User's credentials`, value: 'credentials', slot: 'credentials' as const },
    { label: `User's sessions`, value: 'sessions', slot: 'sessions' as const },
    { label: 'Posts', value: 'posts', slot: 'posts' as const },
  ]);

  const active = computed({
    get() {
      const valid = tabs.value.some(t => t.value === route.query.area)
      return valid ? (route.query.area as string) : 'profile-edit'
    },
    set(tab) {
      router.push({ name: 'office-profile', query: { area: tab } })
    },
  });

  const visited = reactive<Record<string, boolean>>({ 'profile-edit': true });
  watch(active, v => { visited[v] = true }, { immediate: true });

  const isEditTab = computed(() => active.value === 'profile-edit');
</script>

<template>
  <UContainer v-if="loggedIn" class="flex flex-col gap-2 items-center mt-2 max-w-full">
    <h2 class="text-3xl">Hello, <i>{{ user!.login }}</i></h2>

    <UContainer class="flex flex-col md:flex-row gap-4 mt-2 items-start w-full max-w-full">
      <office-avatar-upload :editable="isEditTab" />

      <UTabs v-model="active" variant="link" :items="tabs" class="w-full">
        <template #profile>
          <lazy-office-profile-edit v-if="visited['profile-edit']" />
        </template>
        <template #credentials>
          <lazy-office-credentials v-if="visited['credentials']" />
        </template>
        <template #sessions>
          <lazy-office-sessions v-if="visited['sessions']" />
        </template>
        <template #posts>
          <lazy-office-posts v-if="visited['posts']" />
        </template>
      </UTabs>
    </UContainer>
  </UContainer>
</template>