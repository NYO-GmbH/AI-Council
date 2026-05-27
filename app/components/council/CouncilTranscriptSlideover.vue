<script setup lang="ts">
import type { CouncilMessage } from '~/composables/council/types'

const props = defineProps<{
  open: boolean
  transcript: CouncilMessage[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

function roleLabel(message: CouncilMessage) {
  if (message.role === 'agent') {
    return message.member?.name || 'Agent'
  }
  if (message.role === 'user') {
    return 'Du'
  }
  return 'System'
}

function roleColor(role: CouncilMessage['role']) {
  if (role === 'agent') {
    return 'primary'
  }
  if (role === 'user') {
    return 'info'
  }
  return 'warning'
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    title="Live-Protokoll"
    side="right"
    :ui="{ content: 'max-w-xl w-full' }"
  >
    <template #body>
      <UEmpty
        v-if="props.transcript.length === 0"
        icon="i-lucide-messages-square"
        title="Noch keine Nachrichten"
        description="Starte eine Sitzung, um das Protokoll zu beginnen."
      />
      <UScrollArea v-else class="pr-1">
        <div class="space-y-3 pr-2">
          <UCard
            v-for="message in props.transcript"
            :key="message.id"
            variant="subtle"
            :class="['line', `role-${message.role}`]"
          >
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <UBadge :color="roleColor(message.role)" variant="soft">
                {{ roleLabel(message) }}
              </UBadge>
              <span class="text-xs text-muted">{{ new Date(message.createdAt).toLocaleTimeString() }}</span>
            </div>
            <p class="text-sm">
              {{ message.content }}
            </p>
          </UCard>
        </div>
      </UScrollArea>
    </template>
  </USlideover>
</template>

<style scoped>
.line {
  border: 1px solid var(--ui-border);
}

.role-agent {
  border-color: color-mix(in srgb, var(--ui-primary) 40%, var(--ui-border));
}

.role-user {
  border-color: color-mix(in srgb, #0ea5e9 55%, var(--ui-border));
}

.role-system {
  border-color: color-mix(in srgb, #f59e0b 55%, var(--ui-border));
}
</style>
