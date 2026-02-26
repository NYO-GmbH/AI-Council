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
  deleteMeeting
} = useCouncilMeeting()
</script>

<template>
  <UContainer>
    <UPageHeader
      headline="Council Chamber"
      title="Agent Roundtable"
      description="Run, monitor, and steer multi-agent deliberation in real time."
    >
      <template #links>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          @click="refreshMeetings()"
        >
          Refresh
        </UButton>
      </template>
      <template #default>
        <div class="max-w-md">
          <UFormField label="Meeting">
            <USelect
              v-model="selectedMeetingId"
              :items="meetingOptions"
              placeholder="Select a meeting"
            />
          </UFormField>
        </div>
      </template>
    </UPageHeader>

    <UPageBody>
      <div class="space-y-4">
        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <CouncilMeetingScene
            :meeting="meeting"
            :room-members="roomMembers"
            :active-speaker="activeSpeaker"
            :round-label="roundLabel"
            :has-active-meeting="Boolean(hasActiveMeeting)"
            :topic="topic"
            :rounds="rounds"
            :creating="creating"
            @update:topic="topic = $event"
            @update:rounds="rounds = $event"
            @start="startMeeting"
          />

          <CouncilTranscriptPanel :transcript="transcript" />
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

      <CouncilVerdictModal v-model:open="verdictOpen" :verdict="verdict" />
    </UPageBody>
  </UContainer>
</template>
