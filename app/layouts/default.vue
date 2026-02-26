<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: "Chamber",
    icon: "i-lucide-orbit",
    to: "/council",
    active: route.path === "/council",
  },
  {
    label: "Members",
    icon: "i-lucide-users",
    to: "/council/members",
    active: route.path.startsWith("/council/members"),
  },
]);
</script>

<template>
  <div>
    <UHeader>
      <template #left>
        <NuxtLink to="/council" class="flex items-end gap-1">
          <Logo class="h-7 w-auto shrink-0" />
          <span class="text-lg font-semibold text-highlighted">Council</span>
        </NuxtLink>
        <TemplateMenu />
      </template>

      <UNavigationMenu :items="navItems" variant="link" />

      <template #right>
        <UColorModeButton />
      </template>

      <template #body>
        <UNavigationMenu
          orientation="vertical"
          :items="navItems"
          highlight
          class="-mx-2.5"
        />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>
  </div>
</template>
