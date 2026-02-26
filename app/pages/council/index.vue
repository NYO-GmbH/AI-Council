<script setup lang="ts">
interface CouncilMember {
  id: string;
  name: string;
  title: string;
  accentColor: string;
  isActive: boolean;
}

interface CouncilMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  createdAt: string;
  member: CouncilMember | null;
}

interface MeetingState {
  queue: string[];
  rounds: number;
  maxRounds: number;
  concluded?: boolean;
  verdict?: {
    summary: string;
    winningIdea: string;
    voteResult: string;
  };
}

interface CouncilMeeting {
  id: string;
  topic: string;
  status: "active" | "paused" | "completed";
  createdAt: string;
  state: MeetingState;
  messages?: CouncilMessage[];
}

const toast = useToast();
const selectedMeetingId = ref<string>();
const meeting = ref<CouncilMeeting | null>(null);
const topic = ref("Plan our next product sprint with clear owner decisions.");
const userNudge = ref("");
const creating = ref(false);
const ticking = ref(false);
const stopping = ref(false);
const rounds = ref(2);
let timer: ReturnType<typeof setInterval> | null = null;

const { data: members } = await useFetch<CouncilMember[]>(
  "/api/council/members",
  {
    default: () => [],
  },
);

const { data: meetings, refresh: refreshMeetings } = await useFetch<
  CouncilMeeting[]
>("/api/council/meetings", {
  default: () => [],
});

const meetingOptions = computed(() =>
  (meetings.value || []).map((item) => ({
    label: item.topic,
    value: item.id,
  })),
);

const roomMembers = computed(
  () => members.value?.filter((member) => member.isActive) || [],
);
const transcript = computed(() => meeting.value?.messages || []);
const activeSpeaker = computed(() =>
  [...transcript.value].reverse().find((message) => message.role === "agent"),
);
const hasActiveMeeting = computed(() => meeting.value?.status === "active");
const roundLabel = computed(() => {
  if (!meeting.value?.state) {
    return "Round 0/0";
  }
  return `Round ${meeting.value.state.rounds}/${meeting.value.state.maxRounds}`;
});
const verdict = computed(() => meeting.value?.state?.verdict);

function seatStyle(index: number, total: number, color: string) {
  const angle = ((Math.PI * 2) / Math.max(total, 1)) * index - Math.PI / 2;
  const radius = 32;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;
  return {
    left: `${x}%`,
    top: `${y}%`,
    "--seat-color": color,
  };
}

function roleLabel(message: CouncilMessage) {
  if (message.role === "agent") {
    return message.member?.name || "Agent";
  }
  if (message.role === "user") {
    return "You";
  }
  return "System";
}

function roleColor(role: CouncilMessage["role"]) {
  if (role === "agent") {
    return "primary";
  }
  if (role === "user") {
    return "info";
  }
  return "warning";
}

async function loadMeeting(id: string) {
  meeting.value = await $fetch(`/api/council/meetings/${id}`);
}

async function tickCouncil(userMessage?: string) {
  if (!selectedMeetingId.value || ticking.value || !hasActiveMeeting.value) {
    return;
  }
  ticking.value = true;
  try {
    const payload = userMessage?.trim()
      ? { userMessage: userMessage.trim() }
      : {};
    await $fetch(`/api/council/meetings/${selectedMeetingId.value}/tick`, {
      method: "POST",
      body: payload,
    });
    await loadMeeting(selectedMeetingId.value);
    await refreshMeetings();
  } catch (error: unknown) {
    const err = error as {
      data?: { statusMessage?: string };
      message?: string;
    };
    toast.add({
      color: "error",
      icon: "i-lucide-alert-circle",
      description:
        err?.data?.statusMessage ||
        err?.message ||
        "Failed to progress meeting.",
    });
  } finally {
    ticking.value = false;
  }
}

async function startMeeting() {
  if (!topic.value.trim()) {
    return;
  }
  creating.value = true;
  try {
    const created = await $fetch<CouncilMeeting>("/api/council/meetings", {
      method: "POST",
      body: {
        topic: topic.value,
        rounds: rounds.value,
      },
    });
    await refreshMeetings();
    selectedMeetingId.value = created.id;
    await loadMeeting(created.id);
    await tickCouncil();
  } finally {
    creating.value = false;
  }
}

async function sendNudge() {
  if (!userNudge.value.trim()) {
    return;
  }
  const nudge = userNudge.value;
  userNudge.value = "";
  await tickCouncil(nudge);
}

async function stopMeeting() {
  if (!selectedMeetingId.value) {
    return;
  }
  stopping.value = true;
  try {
    await $fetch(`/api/council/meetings/${selectedMeetingId.value}/stop`, {
      method: "POST",
    });
    await loadMeeting(selectedMeetingId.value);
    await refreshMeetings();
  } finally {
    stopping.value = false;
  }
}

watch(
  meetings,
  async (value) => {
    if (!value?.length) {
      selectedMeetingId.value = undefined;
      meeting.value = null;
      return;
    }
    if (!selectedMeetingId.value) {
      const preferred =
        value.find((item) => item.status === "active") || value[0];
      selectedMeetingId.value = preferred?.id;
      if (preferred?.id) {
        await loadMeeting(preferred.id);
      }
    }
  },
  { immediate: true },
);

watch(selectedMeetingId, async (id) => {
  if (id) {
    await loadMeeting(id);
  } else {
    meeting.value = null;
  }
});

onMounted(() => {
  timer = setInterval(() => {
    tickCouncil();
  }, 4200);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
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
      <UPageGrid class="gap-4 xl:grid-cols-[1fr_420px]">
        <UCard variant="soft" class="overflow-hidden">
          <div class="scene">
            <div class="room-glow" />

            <div class="round-pill">
              <UBadge color="neutral" variant="soft">
                {{ roundLabel }}
              </UBadge>
              <UBadge
                :color="hasActiveMeeting ? 'success' : 'neutral'"
                variant="soft"
              >
                {{ meeting?.status || "idle" }}
              </UBadge>
              <UBadge color="neutral" variant="outline">
                {{ roomMembers.length }} active members
              </UBadge>
            </div>

            <div class="table-core">
              <div class="table-center">
                <p class="text-xs uppercase tracking-[0.3em] text-white/75">
                  Meeting Topic
                </p>
                <p class="text-sm font-semibold text-white sm:text-base">
                  {{ meeting?.topic || "No meeting selected" }}
                </p>
              </div>
            </div>

            <div
              v-for="(member, index) in roomMembers"
              :key="member.id"
              class="seat"
              :style="seatStyle(index, roomMembers.length, member.accentColor)"
              :class="{ speaking: activeSpeaker?.member?.id === member.id }"
            >
              <div class="avatar-ring">
                <span>{{ member.name.slice(0, 1).toUpperCase() }}</span>
              </div>
              <p class="seat-name">
                {{ member.name }}
              </p>
              <p class="seat-title">
                {{ member.title }}
              </p>
              <UCard
                v-if="activeSpeaker?.member?.id === member.id"
                variant="subtle"
                class="speech-bubble"
              >
                {{ activeSpeaker?.content }}
              </UCard>
            </div>

            <div v-if="!hasActiveMeeting" class="start-overlay">
              <UCard class="start-card" variant="soft">
                <template #header>
                  <h2 class="font-semibold">Start Meeting</h2>
                </template>
                <UForm
                  :state="{ topic, rounds }"
                  class="space-y-3"
                  @submit="startMeeting"
                >
                  <UFormField label="Topic" class="w-full">
                    <UTextarea
                      class="w-full"
                      v-model="topic"
                      :rows="3"
                      placeholder="What should the council discuss?"
                    />
                  </UFormField>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <UFormField label="Rounds">
                      <UInputNumber
                        v-model="rounds"
                        :min="1"
                        :max="5"
                        class="w-full"
                      />
                    </UFormField>
                    <div class="flex items-end">
                      <UButton
                        type="submit"
                        :loading="creating"
                        icon="i-lucide-play"
                        block
                      >
                        Start council
                      </UButton>
                    </div>
                  </div>
                </UForm>
              </UCard>
            </div>
          </div>
        </UCard>

        <div class="flex min-h-0 flex-col gap-4">
          <UCard variant="soft">
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <h2 class="font-semibold">Live Transcript</h2>
                <UButton
                  icon="i-lucide-square"
                  color="error"
                  variant="soft"
                  size="xs"
                  :loading="stopping"
                  :disabled="!hasActiveMeeting"
                  @click="stopMeeting"
                >
                  Stop meeting
                </UButton>
              </div>
            </template>

            <UEmpty
              v-if="transcript.length === 0"
              icon="i-lucide-messages-square"
              title="No messages yet"
              description="Start a meeting to begin the roundtable transcript."
            />
            <UScrollArea v-else class="h-[380px] pr-1">
              <div class="space-y-3 pr-2">
                <UCard
                  v-for="message in transcript"
                  :key="message.id"
                  variant="subtle"
                  :class="['line', `role-${message.role}`]"
                >
                  <div class="mb-1.5 flex items-center justify-between gap-2">
                    <UBadge :color="roleColor(message.role)" variant="soft">
                      {{ roleLabel(message) }}
                    </UBadge>
                    <span class="text-xs text-muted">{{
                      new Date(message.createdAt).toLocaleTimeString()
                    }}</span>
                  </div>
                  <p class="text-sm">
                    {{ message.content }}
                  </p>
                </UCard>
              </div>
            </UScrollArea>
          </UCard>

          <UCard v-if="hasActiveMeeting" variant="soft">
            <template #header>
              <h2 class="font-semibold">Interrupt Council</h2>
            </template>
            <UForm :state="{ userNudge }" class="space-y-3" @submit="sendNudge">
              <UFormField label="Interruption">
                <UTextarea
                  v-model="userNudge"
                  :rows="3"
                  placeholder="Interrupt with new constraints or a direction change..."
                />
              </UFormField>
              <UButton type="submit" icon="i-lucide-send" block variant="soft">
                Send interruption
              </UButton>
            </UForm>
          </UCard>

          <UCard v-if="verdict" variant="soft">
            <template #header>
              <h2 class="font-semibold">Final Verdict</h2>
            </template>
            <div class="space-y-2 text-sm">
              <UAlert
                color="success"
                variant="subtle"
                icon="i-lucide-check-circle-2"
                title="Conclusion"
                :description="verdict.summary"
              />
              <UAlert
                color="info"
                variant="subtle"
                icon="i-lucide-lightbulb"
                title="Winning idea"
                :description="verdict.winningIdea"
              />
              <UAlert
                color="warning"
                variant="subtle"
                icon="i-lucide-scale"
                title="Vote"
                :description="verdict.voteResult"
              />
            </div>
          </UCard>
        </div>
      </UPageGrid>
    </UPageBody>
  </UContainer>
</template>

<style scoped>
.scene {
  position: relative;
  min-height: 760px;
  overflow: hidden;
  border-radius: 1rem;
  background:
    radial-gradient(
      circle at 50% 40%,
      rgba(120, 53, 15, 0.62),
      rgba(23, 23, 23, 0.95)
    ),
    linear-gradient(135deg, rgba(30, 64, 175, 0.28), rgba(120, 53, 15, 0.28));
}

.round-pill {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 6;
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.room-glow {
  position: absolute;
  inset: 10% 24%;
  border-radius: 9999px;
  background: radial-gradient(
    circle,
    rgba(251, 191, 36, 0.16),
    transparent 72%
  );
}

.table-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40%;
  aspect-ratio: 1 / 1;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  background: radial-gradient(
    circle at 30% 20%,
    rgba(180, 83, 9, 0.95),
    rgba(67, 20, 7, 0.95)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 8px 30px rgba(0, 0, 0, 0.45),
    0 28px 40px rgba(0, 0, 0, 0.45);
}

.table-center {
  width: 68%;
  text-align: center;
}

.seat {
  position: absolute;
  transform: translate(-50%, -50%);
  text-align: center;
  width: 200px;
  transition: transform 200ms ease;
  z-index: 4;
}

.avatar-ring {
  width: 70px;
  height: 70px;
  margin: 0 auto;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  background: color-mix(in srgb, var(--seat-color) 70%, black);
  border: 2px solid color-mix(in srgb, var(--seat-color) 68%, white);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.38);
}

.seat-name {
  color: #fff;
  margin-top: 0.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.seat-title {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.75rem;
}

.speaking {
  transform: translate(-50%, -53%) scale(1.03);
  z-index: 9;
}

.speaking .avatar-ring {
  box-shadow:
    0 0 0 6px color-mix(in srgb, var(--seat-color) 30%, transparent),
    0 14px 28px rgba(0, 0, 0, 0.45);
}

.speech-bubble {
  margin: 0.5rem auto 0;
  position: relative;
  z-index: 10;
  width: 230px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(17, 24, 39, 0.14);
  color: #111827;
  font-size: 0.8rem;
  line-height: 1.35;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.32);
}

.start-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 20;
  background: radial-gradient(
    circle at center,
    rgba(17, 24, 39, 0.22),
    rgba(17, 24, 39, 0.52)
  );
}

.start-card {
  position: relative;
  z-index: 21;
  width: min(620px, 92%);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(6px);
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

@media (max-width: 1400px) {
  .scene {
    min-height: 680px;
  }

  .table-core {
    width: 46%;
  }

  .seat {
    width: 170px;
  }
}

@media (max-width: 800px) {
  .scene {
    min-height: 560px;
  }

  .table-core {
    width: 58%;
  }

  .seat {
    width: 132px;
  }

  .avatar-ring {
    width: 56px;
    height: 56px;
  }

  .speech-bubble {
    width: 165px;
  }
}
</style>
