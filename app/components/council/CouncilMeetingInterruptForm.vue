<script setup lang="ts">
const props = defineProps<{
  hasActiveMeeting: boolean;
  userNudge: string;
}>();

const emit = defineEmits<{
  (e: "update:user-nudge", value: string): void;
  (e: "send"): void;
}>();
</script>

<template>
  <div class="flex min-h-0 flex-col gap-4">
    <UCard v-if="props.hasActiveMeeting" variant="soft">
      <template #header>
        <h2 class="font-semibold">Rat unterbrechen</h2>
      </template>
      <UForm
        :state="{ userNudge: props.userNudge }"
        class="space-y-3"
        @submit="emit('send')"
      >
        <UFormField label="Unterbrechung" class="w-full">
          <UTextarea
            :model-value="props.userNudge"
            :rows="3"
            class="w-full"
            placeholder="Mit neuen Einschränkungen oder einer Richtungsänderung unterbrechen..."
            @update:model-value="emit('update:user-nudge', $event)"
          />
        </UFormField>
        <UButton type="submit" icon="i-lucide-send" block variant="soft">
          Unterbrechung senden
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>
