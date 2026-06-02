<script setup lang="ts">
import { Motion } from 'motion-v'

definePageMeta({ layout: false })

const session = useCookie('demo-session')
if (session.value) {
  await navigateTo('/council')
}

const input = ref('')
const shake = ref(false)
const loading = ref(false)

async function submit() {
  if (!input.value.trim()) return
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { code: input.value.trim() } })
    await navigateTo('/council')
  } catch {
    input.value = ''
    loading.value = false
    shake.value = true
    setTimeout(() => { shake.value = false }, 600)
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
    <Motion
      :initial="{ opacity: 0, y: 24, scale: 0.97 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.35, ease: 'easeOut' }"
      as="div"
      :class="['w-full max-w-sm px-4', { 'animate-shake': shake }]"
    >
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-lock" class="text-muted size-4" />
            <p class="text-sm font-semibold">Demo-Zugang</p>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submit">
          <UFormField label="Zugangscode">
            <UInput
              v-model="input"
              type="password"
              placeholder="Code eingeben"
              autofocus
              autocomplete="off"
              class="w-full font-mono"
            />
          </UFormField>

          <UButton
            type="submit"
            block
            :loading="loading"
            icon="i-lucide-arrow-right"
            trailing
          >
            Zugang bestätigen
          </UButton>
        </form>
      </UCard>
    </Motion>
  </div>
</template>
