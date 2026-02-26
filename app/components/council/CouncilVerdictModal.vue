<script setup lang="ts">
import type { MeetingVerdict } from '~/composables/council/types'

const props = defineProps<{
  open: boolean
  verdict?: MeetingVerdict
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})
</script>

<template>
  <UModal v-model:open="isOpen" title="Final Verdict">
    <template #body>
      <div v-if="props.verdict" class="space-y-2 text-sm">
        <UAlert
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle-2"
          title="Conclusion"
          :description="props.verdict.summary"
        />
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-lightbulb"
          title="Winning idea"
          :description="props.verdict.winningIdea"
        />
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-scale"
          title="Vote"
          :description="props.verdict.voteResult"
        />
      </div>
      <UEmpty
        v-else
        icon="i-lucide-hourglass"
        title="No verdict yet"
        description="The council will publish a final verdict when deliberation concludes."
      />
    </template>
  </UModal>
</template>
