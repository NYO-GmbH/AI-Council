<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Chamber',
    icon: 'i-lucide-orbit',
    to: '/council',
    active: route.path === '/council'
  },
  {
    label: 'Members',
    icon: 'i-lucide-users',
    to: '/council/members',
    active: route.path.startsWith('/council/members')
  }
])
</script>

<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.1),transparent_45%),radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_40%),var(--ui-bg)] p-2 sm:p-4"
  >
    <UContainer class="h-full max-w-[1500px] px-0">
      <UCard
        class="h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] shadow-xl"
        variant="soft"
        :ui="{
          root: 'h-full overflow-hidden flex flex-col',
          body: 'p-0 min-h-0 flex-1'
        }"
      >
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <NuxtLink to="/council" class="flex items-end gap-1">
                <Logo class="h-7 w-auto shrink-0" />
                <span class="text-lg font-semibold text-highlighted">Council</span>
              </NuxtLink>
              <UBadge color="neutral" variant="subtle" size="sm">
                AI Panel
              </UBadge>
            </div>

            <div class="flex items-center gap-2">
              <UColorModeButton />
            </div>
          </div>
          <UNavigationMenu
            :items="navItems"
            highlight
            class="mt-4 w-full border-t border-default pt-3"
          />
        </template>

        <main class="h-full min-h-0 overflow-auto">
          <slot />
        </main>
      </UCard>
    </UContainer>
  </div>
</template>
