<script setup lang="ts">
const props = defineProps<{
  hasActiveMeeting: boolean
  hasVerdict: boolean
  stopping: boolean
  deleting: boolean
  hasSelection: boolean
}>()

const emit = defineEmits<{
  (e: 'show-verdict' | 'stop' | 'delete'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UButton
      icon="i-lucide-gavel"
      color="neutral"
      variant="soft"
      :disabled="!props.hasVerdict"
      @click="emit('show-verdict')"
    >
      Abschlussurteil anzeigen
    </UButton>
    <UButton
      icon="i-lucide-square"
      color="error"
      variant="soft"
      size="sm"
      :loading="props.stopping"
      :disabled="!props.hasActiveMeeting"
      @click="emit('stop')"
    >
      Sitzung beenden
    </UButton>
    <UButton
      icon="i-lucide-trash-2"
      color="error"
      variant="outline"
      size="sm"
      :loading="props.deleting"
      :disabled="!props.hasSelection"
      @click="emit('delete')"
    >
      Sitzung löschen
    </UButton>
  </div>
</template>
