<script setup lang="ts">
import type { CouncilMessage } from '~/composables/council/types'

const props = defineProps<{
  transcript: CouncilMessage[]
}>()

const emit = defineEmits<{
  (e: 'hover-member', memberId?: string): void
}>()

const scrollEl = ref<HTMLElement | null>(null)
const userPinnedToBottom = ref(true)
const bottomThresholdPx = 24

const transcriptSignature = computed(() =>
  props.transcript.map(message => `${message.id}:${message.content.length}`).join('|')
)

const showBackToBottom = computed(() =>
  props.transcript.length > 0 && !userPinnedToBottom.value
)

function roleLabel(message: CouncilMessage) {
  if (message.role === 'agent') {
    return message.member?.name || 'Agent'
  }
  if (message.role === 'user') {
    return 'You'
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

function isAtBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= bottomThresholdPx
}

function syncPinnedState() {
  if (!scrollEl.value) {
    return
  }
  userPinnedToBottom.value = isAtBottom(scrollEl.value)
}

function scrollToBottom(behavior: ScrollBehavior = 'auto') {
  if (!scrollEl.value) {
    return
  }
  scrollEl.value.scrollTo({
    top: scrollEl.value.scrollHeight,
    behavior
  })
}

function backToBottom() {
  userPinnedToBottom.value = true
  scrollToBottom('instant')
}

function hoveredMemberId(message: CouncilMessage) {
  if (message.role !== 'agent') {
    return undefined
  }
  return message.member?.id
}

function onMessageEnter(message: CouncilMessage) {
  emit('hover-member', hoveredMemberId(message))
}

function onMessageLeave() {
  emit('hover-member', undefined)
}

watch(
  transcriptSignature,
  async () => {
    await nextTick()
    if (userPinnedToBottom.value) {
      scrollToBottom('instant')
      return
    }
    syncPinnedState()
  },
  { flush: 'post' }
)

onMounted(async () => {
  await nextTick()
  scrollToBottom('auto')
  syncPinnedState()
})
</script>

<template>
  <UCard class="transcript-panel" variant="soft">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <h2 class="font-semibold">
            Live Transcript
          </h2>
          <UBadge color="neutral" variant="soft">
            {{ props.transcript.length }}
          </UBadge>
        </div>
        <UButton
          v-if="showBackToBottom"
          icon="i-lucide-pin"
          color="neutral"
          variant="soft"
          size="xs"
          @click="backToBottom"
        >
          Re-pin
        </UButton>
      </div>
    </template>

    <UEmpty
      v-if="props.transcript.length === 0"
      icon="i-lucide-messages-square"
      title="No messages yet"
      description="Start a meeting to begin the roundtable transcript."
    />

    <div v-else class="transcript-shell" @mouseleave="onMessageLeave">
      <div
        ref="scrollEl"
        class="transcript-scroll pr-1"
        @scroll="syncPinnedState"
      >
        <div class="space-y-3 pr-2">
          <UCard
            v-for="message in props.transcript"
            :key="message.id"
            variant="subtle"
            :class="['line', `role-${message.role}`]"
            @mouseenter="onMessageEnter(message)"
            @mouseleave="onMessageLeave"
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
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.transcript-panel {
  height: min(760px, 75vh);
}

.transcript-shell {
  position: relative;
}

.transcript-scroll {
  height: calc(min(760px, 75vh) - 5.25rem);
  overflow-y: auto;
  scroll-behavior: smooth;
}

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

@media (max-width: 1279px) {
  .transcript-panel {
    height: auto;
  }

  .transcript-scroll {
    height: min(360px, 45vh);
  }
}
</style>
