<script setup lang="ts">
const {
  selectedMeetingId,
  meeting,
  topic,
  userNudge,
  creating,
  stopping,
  deleting,
  rounds,
  verdictOpen,
  meetingPhase,
  finalStreamSpeaker,
  finalStreamContent,
  finalStreamEntries,
  meetingOptions,
  roomMembers,
  transcript,
  activeSpeaker,
  hasActiveMeeting,
  roundLabel,
  verdict,
  refreshMeetings,
  startMeeting,
  sendNudge,
  stopMeeting,
  deleteMeeting,
} = useCouncilMeeting();

const hoveredMemberId = ref<string>();
const createMeetingOpen = ref(false);

const { data: settings, refresh: refreshSettings } = useFetch("/api/settings");
const localApiKey = ref("");
onMounted(() => {
  localApiKey.value = localStorage.getItem("openai-api-key") ?? "";
});
const needsApiKey = computed(
  () =>
    settings.value?.provider === "openai" &&
    !localApiKey.value &&
    !settings.value?.hasEnvApiKey,
);

const settingsSaved = useSettingsSaved();
watch(settingsSaved, () => {
  refreshSettings();
  localApiKey.value = localStorage.getItem("openai-api-key") ?? "";
});

async function handleStartMeeting() {
  await startMeeting();
  createMeetingOpen.value = false;
}
</script>

<template>
  <UContainer>
    <UPageHeader
      headline="Ratskammer"
      title="Agenten-Rundtisch"
      description="Führe, überwache und steuere die Beratung mehrerer Agenten in Echtzeit."
    >
      <template #default>
        <div class="flex flex-wrap items-end gap-2">
          <div class="max-w-md flex-1 min-w-64">
            <UFormField label="Sitzung" class="w-full truncate">
              <USelect
                v-model="selectedMeetingId"
                :items="meetingOptions"
                placeholder="Sitzung auswählen"
                class="w-full truncate"
              />
            </UFormField>
          </div>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            :disabled="needsApiKey"
            @click="createMeetingOpen = true"
          >
            Neue Sitzung
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            @click="refreshMeetings()"
          >
            Aktualisieren
          </UButton>
        </div>
      </template>
    </UPageHeader>

    <UPageBody>
      <div class="space-y-4">
        <UAlert
          v-if="needsApiKey"
          color="warning"
          icon="i-lucide-key-round"
          title="OpenAI API-Key fehlt"
          description="Bitte trage deinen OpenAI API-Key in den Einstellungen ein, um eine Sitzung zu starten."
        />
        <div
          class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start"
        >
          <CouncilMeetingScene
            :meeting="meeting"
            :room-members="roomMembers"
            :active-speaker="activeSpeaker"
            :highlighted-member-id="hoveredMemberId"
            :round-label="roundLabel"
            :has-active-meeting="Boolean(hasActiveMeeting)"
          />

          <CouncilTranscriptPanel
            :transcript="transcript"
            @hover-member="hoveredMemberId = $event"
          />
        </div>

        <CouncilMeetingControls
          :has-active-meeting="Boolean(hasActiveMeeting)"
          :has-verdict="Boolean(verdict)"
          :stopping="stopping"
          :deleting="deleting"
          :has-selection="Boolean(selectedMeetingId)"
          @show-verdict="verdictOpen = true"
          @stop="stopMeeting"
          @delete="deleteMeeting"
        />

        <CouncilMeetingInterruptForm
          :has-active-meeting="Boolean(hasActiveMeeting)"
          :user-nudge="userNudge"
          @update:user-nudge="userNudge = $event"
          @send="sendNudge"
        />
      </div>

      <CouncilVerdictModal
        v-model:open="verdictOpen"
        :verdict="verdict"
        :phase="meetingPhase"
        :live-speaker="finalStreamSpeaker"
        :live-content="finalStreamContent"
        :live-entries="finalStreamEntries"
      />

      <UModal v-model:open="createMeetingOpen" title="Sitzung starten">
        <template #body>
          <UForm
            :state="{ topic, rounds }"
            class="space-y-3"
            @submit="handleStartMeeting"
          >
            <UFormField label="Thema" class="w-full">
              <UTextarea
                class="w-full"
                :model-value="topic"
                :rows="3"
                placeholder="Worüber soll der Rat beraten?"
                @update:model-value="topic = $event"
              />
            </UFormField>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <UFormField label="Runden">
                <UInputNumber
                  :model-value="rounds"
                  :min="1"
                  :max="5"
                  class="w-full"
                  @update:model-value="rounds = $event || 1"
                />
              </UFormField>
              <div class="flex items-end">
                <UButton
                  type="submit"
                  :loading="creating"
                  :disabled="needsApiKey"
                  icon="i-lucide-play"
                  block
                >
                  Rat starten
                </UButton>
              </div>
            </div>
          </UForm>
        </template>
      </UModal>
    </UPageBody>
  </UContainer>
</template>
