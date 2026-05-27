<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const saving = ref(false)

const form = reactive({
  baseUrl: '',
  modelName: '',
})

const { data: settings, refresh } = await useFetch('/api/settings')

watch(
  settings,
  (s) => {
    if (!s) return
    form.baseUrl = s.baseUrl
    form.modelName = s.modelName
  },
  { immediate: true },
)

watch(open, (val) => {
  if (val) refresh()
})

async function save() {
  saving.value = true
  try {
    await $fetch('/api/settings', {
      method: 'PATCH',
      body: { baseUrl: form.baseUrl, modelName: form.modelName },
    })
    toast.add({ color: 'success', description: 'Einstellungen gespeichert.' })
    open.value = false
  } catch {
    toast.add({ color: 'error', description: 'Einstellungen konnten nicht gespeichert werden.' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Einstellungen" description="LM Studio Verbindung konfigurieren">
    <template #body>
      <UForm :state="form" class="space-y-4" @submit="save">
        <UFormField
          label="LM Studio URL"
          :hint="settings?.defaults?.baseUrl"
          description="Basis-URL des LM Studio API-Servers"
        >
          <UInput
            v-model="form.baseUrl"
            placeholder="http://localhost:1235/v1"
            class="w-full font-mono"
          />
        </UFormField>

        <UFormField
          label="Modellname"
          :hint="settings?.defaults?.modelName"
          description="Modell-ID, wie in LM Studio geladen"
        >
          <UInput
            v-model="form.modelName"
            placeholder="qwen/qwen3-4b-2507"
            class="w-full font-mono"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-1">
          <UButton color="neutral" variant="outline" @click="open = false">
            Abbrechen
          </UButton>
          <UButton type="submit" icon="i-lucide-save" :loading="saving">
            Speichern
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
