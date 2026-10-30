import { defineStore } from 'pinia';
import type { 
  AssistantPendingFormPatch, 
  AssistantPendingImage, 
  AssistantPendingImageBatch, 
  AssistantPendingNavigation 
} from '~/types/assistant';

export const useAssistantStore = defineStore('assistant', {
  state: () => ({
    open: false,
    activeThreadId: null as string | null,
    filtersOpen: false,
    formSnapshot: null as AssistantFormSnapshot | null,
    pendingNavigation: null as AssistantPendingNavigation | null,
    pendingFormPatch: null as AssistantPendingFormPatch | null,
    /** FIFO queue from repeated propose_stage_image calls in one turn */
    pendingImages: [] as AssistantPendingImage[],
    /** One Accept from propose_stage_images */
    pendingImageBatch: null as AssistantPendingImageBatch | null,
    /** toolCallIds the user already confirmed/dismissed */
    dismissedProposalIds: [] as string[],
  }),
  getters: {
    pendingImage(state): AssistantPendingImage | null {
      return state.pendingImages[0] ?? null;
    },
  },
  actions: {
    openChat() {
      this.filtersOpen = false;
      this.open = true;
    },
    closeChat() {
      this.open = false;
    },
    toggleChat() {
      if (this.open)
        this.closeChat();
      else
        this.openChat();
    },
    setFiltersOpen(value: boolean) {
      if (value) {
        this.open = false;
        this.filtersOpen = true;
        return;
      }
      this.filtersOpen = false;
    },
    setFormSnapshot(snapshot: AssistantFormSnapshot | null) {
      this.formSnapshot = snapshot;
    },
    setActiveThreadId(id: string | null) {
      this.activeThreadId = id;
    },
    markProposalDismissed(toolCallId: string | undefined) {
      if (!toolCallId || this.dismissedProposalIds.includes(toolCallId))
        return;
      this.dismissedProposalIds = [...this.dismissedProposalIds, toolCallId];
    },
    markProposalsDismissed(toolCallIds: string[] | undefined) {
      if (!toolCallIds?.length)
        return;
      for (const id of toolCallIds)
        this.markProposalDismissed(id);
    },
    shiftPendingImage() {
      const [head, ...rest] = this.pendingImages;
      if (head)
        this.markProposalDismissed(head.toolCallId);
      this.pendingImages = rest;
    },
    clearPendingProposals() {
      this.markProposalDismissed(this.pendingNavigation?.toolCallId);
      this.markProposalDismissed(this.pendingFormPatch?.toolCallId);
      this.markProposalsDismissed(this.pendingImageBatch?.toolCallIds);
      this.markProposalDismissed(this.pendingImageBatch?.toolCallId);
      for (const image of this.pendingImages)
        this.markProposalDismissed(image.toolCallId);
      this.pendingNavigation = null;
      this.pendingFormPatch = null;
      this.pendingImages = [];
      this.pendingImageBatch = null;
    },
    resetDismissedProposals() {
      this.dismissedProposalIds = [];
    },
  },
});