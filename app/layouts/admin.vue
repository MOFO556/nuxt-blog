<script setup lang="ts">
  import type { FilteredNavigationMenuItem, MenuFilters } from '~/types/core';

  const { items } = useNavigationItems();
  const navItems = computed(() => {
    return (filterParam: MenuFilters) =>
      items.value.filter((i: FilteredNavigationMenuItem) => {
      return i.filterKeys.includes("auth") && i.filterKeys.includes(filterParam)
    })
  });
  const toaster = { position: 'top-right' as const }
</script>

<template>
	<UApp :toaster="toaster">
		<UHeader to="/"
      :ui="{
        container: 'max-w-full'
      }">
    <template #title>
      <img class="h-6 w-auto" src="/icon.png" alt="blog icon" />
			Blog
    </template>

    <UNavigationMenu :items="navItems('inline')" />

    <template #right>
      <ClientOnly>
        <UColorModeButton />
      </ClientOnly>
      <ClientOnly>
        <UPopover
          class="hidden lg:inline-flex"
          :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
          :ui="{ content: 'w-56 p-2' }">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-menu"
            aria-label="Menu"/>
          <template #content>
            <UNavigationMenu
              :items="navItems('popover')"
              orientation="vertical"/>
          </template>
        </UPopover>
      </ClientOnly>

    </template>
    <template #body>
      <UNavigationMenu :items="navItems('mobile')" orientation="vertical" class="-mx-2.5" />
    </template>
		</UHeader>
    <UPage>
      <slot></slot>
    </UPage>
	</UApp>
 </template>
