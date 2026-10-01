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
  const toaster = { position: 'top-right' as const }
</script>

<template>
	<UApp :toaster="toaster">
		<UHeader to="/"
      :ui="{
        container: 'max-w-full'
      }">
    <template #title>
      <img class="h-6 w-auto" src="/icon.png" alt="blog icon"></img>
			Blog
    </template>

    <UNavigationMenu :items="navItems('inline')" />

    <template #right>
      <UColorModeButton />
      <UButton variant="outline" color="neutral" :to="{ name: 'auth-login' }">Sign In</UButton>
      <UButton variant="outline" :to="{ name: 'auth-register' }">Sign Up</UButton>
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
 