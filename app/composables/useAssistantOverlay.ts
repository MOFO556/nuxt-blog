export function useAssistantOverlay() {
  const store = useAssistantStore();

  const chatOpen = computed({
    get: () => store.open,
    set: (value: boolean) => {
      if (value)
        store.openChat();
      else
        store.closeChat();
    },
  });

  const filtersOpen = computed({
    get: () => store.filtersOpen,
    set: (value: boolean) => store.setFiltersOpen(value),
  });

  return {
    chatOpen,
    filtersOpen,
    toggleChat: () => store.toggleChat(),
    openChat: () => store.openChat(),
    closeChat: () => store.closeChat(),
  };
}