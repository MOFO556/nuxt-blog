<script setup lang="ts">
import type { FilteredNavigationMenuItem, MenuFilters } from '~/types/core';

const { loggedIn } = useUserStore();
const { items } = useNavigationItems();
const navItems = computed(() => {
	return (filterParam: MenuFilters) => 
		items.value.filter((i: FilteredNavigationMenuItem) => {
		return (!loggedIn && i.filterKeys.includes("guest")) && i.filterKeys.includes(filterParam)
	})
});
</script>

<template>
	<UApp>
		<UHeader to="/">
    <template #title>
      <img class="h-6 w-auto" src="/icon.png"></img>
			Blog
    </template>

		<ClientOnly>			
			<UNavigationMenu :items="navItems('inline')" />
		</ClientOnly>

    <template #right>
      <UColorModeButton />

        <UPopover
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
 