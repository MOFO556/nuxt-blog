<script setup lang="ts">
  import type { CredentialsInfo } from '~/types/user';

  const { $api } = useNuxtApp();
  const { user } = useUserStore();
  const toast = useToast();

  const { data: credentials, refresh: refreshCredentials } = await useAsyncData<CredentialsInfo[]>(
    'credentials-info',
    $api.auth.getConnections,
  );

  const isPasskey = (c: CredentialsInfo) => c.deviceType === 'multiDevice' && c.backedUp;
  const passkeyAdd = () =>
    $api.auth.addPasskey()
      .then(() => refreshCredentials())
      .catch(e =>
        toast.add({
          title: 'Error',
          color: 'error',
          description: `Unable to add passkey! ${e?.message ?? ''}`,
        }),
      );
      
  const { on } = useRealtime();
  const off = on(`user:${user!.id}`, (payload) => {
    if (payload.type === 'credentials:added') {
        refreshCredentials();
    };
    if (payload.type === 'credentials:removed') {
        refreshCredentials();
    };
  });  
  onBeforeUnmount(off);
</script>

<template>
  <UContainer class="flex flex-col w-full items-start max-w-full">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UCard v-for="connection in credentials ?? []" :key="connection.id"
        class="w-full"
        :ui="{ header: 'p-2 sm:px-4', body: 'p-2 sm:p-4' }">
        <template #header>
          <div class="flex items-center gap-1 w-full">
            <UIcon :name="isPasskey(connection) ? 'i-lucide-key' : 'i-lucide-lock-keyhole'" />
            <span class="w-full">
              {{ isPasskey(connection) ? 'Synced passkey' : 'Hardware key' }} —
              {{ connection.userAgent }}
            </span>
          </div>
        </template>

        <div class="flex items-center gap-1 w-full">
          <span>
            {{ connection.city ? `${connection.city}, ` : '' }}{{ connection.country }}
            Linked at
            {{ formatDate(connection.createdAt) }}
          </span>
        </div>
      </UCard>
    </div>

    <UButton class="mt-2"
      variant="outline"
      icon="i-lucide-key-round"
      @click="passkeyAdd">Add passkey</UButton>
  </UContainer>
</template>