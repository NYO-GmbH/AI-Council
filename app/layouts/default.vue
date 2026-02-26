<script setup lang="ts"></script>

<template>
  <div class="min-h-screen p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-950">
    <div
      class="mx-auto max-w-450 rounded-xl ring ring-default bg-default/85 shadow-sm min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2rem)] overflow-hidden"
    >
      <header
        class="h-14 border-b border-default px-3 sm:px-5 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-3">
          <NuxtLink to="/council" class="flex items-end gap-0.5">
            <Logo class="h-7 w-auto shrink-0" />
            <span class="text-lg font-bold text-highlighted">Council</span>
          </NuxtLink>

          <div class="flex items-center gap-1">
            <UButton to="/council" variant="ghost" size="sm">Chamber</UButton>
            <UButton to="/council/members" variant="ghost" size="sm"
              >Members</UButton
            >
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <UColorModeButton />
        </div>
      </header>

      <main
        class="h-[calc(100vh-1.5rem-3.5rem)] sm:h-[calc(100vh-2rem-3.5rem)] overflow-auto"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
