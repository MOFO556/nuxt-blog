<script setup lang="ts">
  import { formatNavigationHref } from '~~/shared/assistant/navigation';
  import { useAssistantFormBridge } from '~/composables/useAssistantFormBridge';

  const store = useAssistantStore();
  const formBridge = useAssistantFormBridge();
  const toast = useToast();
  const router = useRouter();

  const navigationHref = computed(() => {
    const pending = store.pendingNavigation;
    if (!pending)
      return '';
    return formatNavigationHref(pending.path, pending.query);
  });

  const imageQueueLabel = computed(() => {
    const total = store.pendingImages.length;
    if (total <= 1)
      return null;
    return `Image 1 of ${total}`;
  });

  async function confirmNavigation() {
    const pending = store.pendingNavigation;
    if (!pending)
      return;

    const href = formatNavigationHref(pending.path, pending.query);
    store.clearPendingProposals();
    await router.push(href);
    toast.add({
      title: href.includes('/tag/') || href.includes('/author/') || href.includes('?')
        ? 'Filters applied'
        : 'Navigating',
      description: pending.reason ?? href,
      color: 'success',
    });
  }

  function dismissNavigation() {
    store.markProposalDismissed(store.pendingNavigation?.toolCallId);
    store.pendingNavigation = null;
  }

  function applyFormPatch() {
    const pending = store.pendingFormPatch;
    const bridge = formBridge.value;
    if (!pending || !bridge) {
      toast.add({
        title: 'No open post form',
        description: 'Open create/edit to apply editor suggestions.',
        color: 'warning',
      });
      return;
    }
    bridge.applyPatch(pending.patch);
    store.setFormSnapshot(bridge.getSnapshot());
    store.markProposalDismissed(pending.toolCallId);
    store.pendingFormPatch = null;
    toast.add({ 
      title: 'Applied to form', 
      description: pending.reason ?? undefined, 
      color: 'success' 
    });
  }

  async function stageImage() {
    const pending = store.pendingImage;
    const bridge = formBridge.value;
    if (!pending || !bridge) {
      toast.add({
        title: 'No open post form',
        description: 'Open create/edit to stage images.',
        color: 'warning',
      });
      return;
    }
    try {
      await bridge.stageRemoteImage({
        regularUrl: pending.regularUrl,
        alt: pending.alt,
        photographer: pending.photographer,
        asCover: pending.asCover,
        alsoInContent: pending.alsoInContent,
        forCarousel: pending.forCarousel,
        carouselSlot: pending.carouselSlot,
        includeImageDescriptions: pending.includeImageDescriptions,
      });
      store.shiftPendingImage();
      toast.add({ 
        title: 'Image staged', 
        description: pending.reason ?? undefined, 
        color: 'success' 
      });
    }
    catch (err) {
      toast.add({
        title: 'Could not stage image',
        description: err instanceof Error ? err.message : 'Unknown error',
        color: 'error',
      });
    }
  }

  async function stageImageBatch() {
    const pending = store.pendingImageBatch;
    const bridge = formBridge.value;
    if (!pending || !bridge) {
      toast.add({
        title: 'No open post form',
        description: 'Open create/edit to stage images.',
        color: 'warning',
      });
      return;
    }
    try {
      await bridge.stageRemoteImages(pending.images.map(image => ({
        regularUrl: image.regularUrl,
        alt: image.alt,
        photographer: image.photographer,
        asCover: image.asCover,
        alsoInContent: image.alsoInContent,
        forCarousel: image.forCarousel,
        carouselSlot: image.carouselSlot,
        includeImageDescriptions: image.includeImageDescriptions,
      })));
      store.markProposalsDismissed(pending.toolCallIds);
      store.markProposalDismissed(pending.toolCallId);
      store.pendingImageBatch = null;
      toast.add({
        title: 'Images staged',
        description: pending.reason ?? `${pending.images.length} image(s)`,
        color: 'success',
      });
    }
    catch (err) {
      toast.add({
        title: 'Could not stage images',
        description: err instanceof Error ? err.message : 'Unknown error',
        color: 'error',
      });
    }
  }
</script>

<template>
  <div v-if="store.pendingNavigation 
    || store.pendingFormPatch 
    || store.pendingImage 
    || store.pendingImageBatch"
    class="flex flex-col gap-2 border-t border-default bg-default p-3">
    <div v-if="store.pendingNavigation"
      class="rounded-md border border-default bg-elevated p-3 text-sm shadow-sm">
      <p class="font-medium">Go there?</p>
      <p class="text-muted mt-1">{{ store.pendingNavigation.reason || 'Open this page' }}</p>
      <code class="mt-1 block text-xs break-all">
        {{ navigationHref }}
      </code>
      <div class="mt-3 flex gap-2">
        <UButton size="sm" @click.stop="confirmNavigation">
          Confirm
        </UButton>
        <UButton size="sm" 
          color="neutral" 
          variant="outline" 
          @click.stop="dismissNavigation">
          Dismiss
        </UButton>
      </div>
    </div>

    <div v-if="store.pendingFormPatch"
      class="rounded-md border border-default bg-elevated p-3 text-sm shadow-sm">
      <p class="font-medium">Apply form changes?</p>
      <p class="text-muted mt-1">{{ store.pendingFormPatch.reason || 'Update open post fields' }}</p>
      <div class="mt-3 flex gap-2">
        <UButton size="sm" @click.stop="applyFormPatch">
          Accept
        </UButton>
        <UButton size="sm"
          color="neutral"
          variant="outline"
          @click.stop="store.markProposalDismissed(store.pendingFormPatch?.toolCallId); store.pendingFormPatch = null">
          Dismiss
        </UButton>
      </div>
    </div>

    <div v-if="store.pendingImageBatch"
      class="rounded-md border border-default bg-elevated p-3 text-sm shadow-sm">
      <p class="font-medium">Stage {{ store.pendingImageBatch.images.length }} image(s)?</p>
      <div class="mt-2 flex flex-wrap gap-2">
        <img v-for="(image, index) in store.pendingImageBatch.images"
          class="max-h-16 rounded object-cover"
          :key="`${image.imageId}-${index}`"
          :src="image.thumbUrl"
          :alt="image.alt ?? ''">
      </div>
      <p class="text-muted mt-1">
        {{ store.pendingImageBatch.reason || 'Cover, body, and/or carousel' }}
      </p>
      <div class="mt-3 flex gap-2">
        <UButton size="sm" @click.stop="stageImageBatch">
          Accept all
        </UButton>
        <UButton size="sm"
          color="neutral"
          variant="outline"
          @click.stop="store.markProposalsDismissed(store.pendingImageBatch?.toolCallIds); store.markProposalDismissed(store.pendingImageBatch?.toolCallId); store.pendingImageBatch = null">
          Dismiss
        </UButton>
      </div>
    </div>

    <div v-else-if="store.pendingImage"
      class="rounded-md border border-default bg-elevated p-3 text-sm shadow-sm">
      <p class="font-medium">
        Stage image?
        <span v-if="imageQueueLabel" class="text-muted font-normal">
          ({{ imageQueueLabel }})
        </span>
      </p>
      <img v-if="store.pendingImage.thumbUrl"
        class="mt-2 max-h-24 rounded object-cover"
        :src="store.pendingImage.thumbUrl"
        :alt="store.pendingImage.alt ?? ''">
      <p class="text-muted mt-1">
        {{ store.pendingImage.reason || store.pendingImage.photographer || 'Found image' }}
      </p>
      <div class="mt-3 flex gap-2">
        <UButton size="sm" @click.stop="stageImage">
          Accept
        </UButton>
        <UButton size="sm"
          color="neutral"
          variant="outline"
          @click.stop="store.shiftPendingImage()">
          Dismiss
        </UButton>
      </div>
    </div>
  </div>
</template>