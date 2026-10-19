<script setup lang="ts">
  import type { SessionsInfo } from '~/types/user';

  const { $api } = useNuxtApp();
  const { user, logout, postRevokeCleanUp } = useUserStore();
  const revokingId = ref<string | undefined>();

  const { data: sessions, refresh: refreshSessions } = await useAsyncData<SessionsInfo[]>(
    'sessions-info',
    $api.auth.getSessions,
  );

  const revoke = (id: string) => {
    revokingId.value = id;
    $api.auth.revokeSession(id)
      .then(s => {
        refreshSessions();
      })
      .finally(() => {
        revokingId.value = undefined;
      });
  };
  
  const { on } = useRealtime();
  const off = on(`user:${user!.id}`, (payload) => {
    if (payload.type === 'sessions:added') {
        refreshSessions();
    };
    if (payload.type === 'sessions:revoke') {
      const { session } = payload;
      const target = sessions.value?.find(c => c.id === session.id);
      if (!target) 
        return;
      if (target.current)
        postRevokeCleanUp();
      else
        sessions.value = sessions.value!.filter(c => c.id !== session.id);
    };
  });  
  onBeforeUnmount(off);
</script>

<template>
  <UContainer class="py-6 max-w-full">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="session in sessions"
        class="h-full flex flex-col"
        :class="session.invalidated && 'opacity-60'"
        :key="session.id"
        :ui="{ header: 'p-2 sm:px-4', body: 'p-2 sm:p-4', footer: 'p-1 sm:p-2' }">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon class="size-5 shrink-0 text-gray-500"
                :name="session.loginMethod === 'passkey'
                  ? 'i-lucide-key-round'
                  : 'i-lucide-lock'"/>
              <span class="font-medium truncate">
                {{ session.userAgent || 'Unknown device' }}
              </span>
            </div>

            <UBadge v-if="session.current"
              class="shrink-0 no-text-selection"
              color="primary"
              variant="subtle"
              size="sm">This device</UBadge>
          </div>
        </template>
        
        <div class="flex flex-col gap-2 text-sm grow">
          <div class="flex items-center gap-1.5 text-gray-500">
            <UIcon name="i-lucide-map-pin" class="size-4 shrink-0" />
            <span class="truncate">
              {{ [session.city, session.country].filter(Boolean).join(', ')
                 || 'Unknown location' }}
            </span>
          </div>

          <div class="flex items-center gap-1.5 text-gray-500">
            <UIcon name="i-lucide-clock" class="size-4 shrink-0" />
            <span>
              {{ session.current
                ? 'Active now'
                : `Last seen ${formatDateRelative(session.lastSeenAt)}` }}
            </span>
          </div>

          <div class="flex items-center gap-1.5 text-gray-500">
            <UIcon class="size-4 shrink-0"
              :name="session.loginMethod === 'passkey'
                ? 'i-lucide-shield-check'
                : 'i-lucide-shield'"/>
            <span>
              Signed in with
              {{ session.loginMethod === 'passkey' ? 'a passkey' : 'a password' }}
            </span>
          </div>

          <UBadge
            v-if="session.invalidated"
            color="warning"
            variant="subtle"
            class="self-start mt-1"
          >
            {{ session.invalidReason || 'No longer valid' }}
          </UBadge>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton color="error"
              variant="ghost"
              size="sm"
              icon="i-lucide-log-out"
              :loading="revokingId === session.id"
              @click="session.current ? logout() : revoke(session.id)">
              {{ session.current ? 'Sign out' : 'Revoke' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </UContainer>
</template>