<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

const toast = useToast();
const saving = ref(false);
const settingsSaved = useSettingsSaved();

const providerOptions = [
  { label: "LM Studio", value: "lmstudio" },
  { label: "OpenAI", value: "openai" },
];

const form = reactive({
  provider: "lmstudio" as "lmstudio" | "openai",
  baseUrl: "",
  modelName: "",
});

const apiKey = ref("");

const modelNamePlaceholder = computed(() =>
  form.provider === "openai" ? "gpt-4o-mini" : "qwen/qwen3-4b-2507",
);

const { data: settings, refresh } = await useFetch("/api/settings");

watch(
  settings,
  (s) => {
    if (!s) return;
    form.provider = s.provider as "lmstudio" | "openai";
    form.baseUrl = s.baseUrl;
    form.modelName = s.modelName;
  },
  { immediate: true },
);

onMounted(() => {
  apiKey.value = localStorage.getItem("openai-api-key") ?? "";
});

watch(open, (val) => {
  if (val) {
    refresh();
    apiKey.value = localStorage.getItem("openai-api-key") ?? "";
  }
});

watch(
  () => form.provider,
  (provider) => {
    form.modelName =
      provider === "openai"
        ? "gpt-4o-mini"
        : (settings.value?.defaults?.modelName ?? "qwen/qwen3-4b-2507");
  },
);

async function save() {
  saving.value = true;
  try {
    await $fetch("/api/settings", {
      method: "PATCH",
      body: {
        provider: form.provider,
        baseUrl: form.baseUrl,
        modelName: form.modelName,
      },
    });
    if (apiKey.value.trim()) {
      localStorage.setItem("openai-api-key", apiKey.value.trim());
    } else {
      localStorage.removeItem("openai-api-key");
    }
    settingsSaved.value = Date.now();
    toast.add({ color: "success", description: "Einstellungen gespeichert." });
    open.value = false;
  } catch {
    toast.add({
      color: "error",
      description: "Einstellungen konnten nicht gespeichert werden.",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Einstellungen"
    description="KI-Anbieter konfigurieren"
  >
    <template #body>
      <UForm :state="form" class="space-y-4" @submit="save">
        <UFormField
          label="Anbieter"
          description="KI-Anbieter für die Ratssitzung"
        >
          <USelect
            v-model="form.provider"
            :items="providerOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="form.provider === 'openai'"
          label="OpenAI API Key"
          description="Wird nur lokal im Browser gespeichert"
        >
          <UInput
            v-model="apiKey"
            type="password"
            placeholder="sk-..."
            class="w-full font-mono"
          />
        </UFormField>

        <UFormField
          v-if="form.provider === 'lmstudio'"
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
          :hint="
            form.provider === 'openai'
              ? 'gpt-4o-mini'
              : settings?.defaults?.modelName
          "
          :description="
            form.provider === 'openai'
              ? 'OpenAI Modell-ID'
              : 'Modell-ID, wie in LM Studio geladen'
          "
        >
          <UInput
            v-model="form.modelName"
            :placeholder="modelNamePlaceholder"
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
