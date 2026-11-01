<script setup lang="ts">
import type { FilteredNavigationMenuItem, MenuFilters } from '~/types/core';

const route = useRoute();
const { items } = useNavigationItems();
const showFloatingAssistant = computed(() => !route.meta.assistantDocked);
const navItems = computed(() => {
	return (filterParam: MenuFilters) =>
		items.value.filter((i: FilteredNavigationMenuItem) => {
		return i.filterKeys.includes("guest") && i.filterKeys.includes(filterParam)
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
      <span data-mascot-hotspot="home" class="inline-flex items-center gap-2">
        <img class="h-6 w-auto" src="/icon.png" alt="blog icon" />
        Blog
      </span>
    </template>
    <template #toggle="{ open, toggle, ui }">
      <UButton data-mascot-hotspot="menu"
        color="neutral"
        variant="ghost"
        :aria-label="open ? 'Close menu' : 'Open menu'"
        :icon="open ? 'i-lucide-x' : 'i-lucide-menu'"
        :class="ui.toggle({ toggleSide: 'right' })"
        @click="toggle"/>
    </template>

    <UNavigationMenu :items="navItems('inline')" />

    <template #right>
      <ClientOnly>
        <span data-mascot-hotspot="color-mode" class="inline-flex">
          <UColorModeButton />
        </span>
      </ClientOnly>
      <span data-mascot-hotspot="sign-in" class="inline-flex">
        <UButton variant="outline" color="neutral" :to="{ name: 'auth-login' }">Sign In</UButton>
      </span>
      <span data-mascot-hotspot="sign-up" class="inline-flex">
        <UButton variant="outline" :to="{ name: 'auth-register' }">Sign Up</UButton>
      </span>
    </template>
    <template #body>
      <UNavigationMenu :items="navItems('mobile')" orientation="vertical" class="-mx-2.5" />
    </template>
		</UHeader>
    <UPage>
      <slot></slot>
    </UPage>
    <template v-if="showFloatingAssistant">
      <assistant-fab/>
      <assistant-panel/>
    </template>
	</UApp>
 </template>
