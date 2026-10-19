<script setup lang="ts">
  import type { CredentialsInfo } from '~/types/user';
  import { LazyConfirmDialog } from '#components';

  const { $api } = useNuxtApp();
  const { user } = useUserStore();
  const toast = useToast();
  const overlay = useOverlay();
  const confirm = overlay.create(LazyConfirmDialog);

  const { data: credentials, refresh: refreshCredentials } = await useAsyncData<CredentialsInfo[]>(
    'credentials-info',
    $api.auth.getConnections,
  );

  const isPasskey = (c: CredentialsInfo) => c.deviceType === 'multiDevice' && c.backedUp;
  const passkeyAdd = () =>
    $api.auth.addPasskey()
      .then(() => refreshCredentials())
      .catch(err =>
        toast.add({
          title: 'Error',
          color: 'error',
          description: `Unable to add passkey! ${err?.message ?? ''}`,
        }),
      );
  const passkeyRemove = async (id: string) => {
    const confirmInstance = confirm.open({
      description: 'Do you want to remove passkey?'
    });
    const confirmResult = await confirmInstance.result;
    if (confirmResult)
      $api.auth.removePasskey(id)
        .catch(err => {
          toast.add({
            title: 'Error',
            color: 'error',
            description: `Unable to delete passkey! ${err?.message ?? ''}`,
          })
        });
    else
      return;
  }
      
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
      <LazyUCard v-for="connection in credentials ?? []" :key="connection.id"
        class="w-full"
        :ui="{ header: 'p-2 sm:px-4', body: 'p-2 sm:p-4' }">
        <template #header>
          <div class="flex items-center gap-1 w-full pr-6 relative">
            <UIcon :name="isPasskey(connection) ? 'i-lucide-key' : 'i-lucide-lock-keyhole'" />
            <span class="w-full">
              {{ isPasskey(connection) ? 'Synced passkey' : 'Hardware key' }} —
              {{ connection.userAgent }}
            </span>
            <UIcon class="absolute right-0 bg-error cursor-pointer" 
              name="i-lucide-x"
              @click.prevent="passkeyRemove(connection.id)"/>
          </div>
        </template>

        <div class="flex items-center gap-1 w-full">
          <span>
            {{ connection.city ? `${connection.city}, ` : '' }}{{ connection.country }}
            Linked at
            {{ formatDateRelative(connection.createdAt) }}
          </span>
        </div>
      </LazyUCard>
    </div>

    <UButton class="mt-2"
      variant="outline"
      icon="i-lucide-key-round"
      @click="passkeyAdd">Add passkey</UButton>
  </UContainer>
</template>