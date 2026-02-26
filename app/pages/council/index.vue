<script setup lang="ts">
interface CouncilMember {
  id: string
  name: string
  title: string
  accentColor: string
  isActive: boolean
}

interface CouncilMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  createdAt: string
  member: CouncilMember | null
}

interface MeetingState {
  queue: string[]
  rounds: number
  maxRounds: number
  concluded?: boolean
  verdict?: {
    summary: string
    winningIdea: string
    voteResult: string
  }
}

interface CouncilMeeting {
  id: string
  topic: string
  status: 'active' | 'paused' | 'completed'
  createdAt: string
  state: MeetingState
  messages?: CouncilMessage[]
}

const toast = useToast()
const selectedMeetingId = ref<string>()
const meeting = ref<CouncilMeeting | null>(null)
const topic = ref('Plan our next product sprint with clear owner decisions.')
const userNudge = ref('')
const creating = ref(false)
const ticking = ref(false)
const stopping = ref(false)
const rounds = ref(2)
let timer: ReturnType<typeof setInterval> | null = null

const { data: members } = await useFetch<CouncilMember[]>('/api/council/members', {
  default: () => []
})

const { data: meetings, refresh: refreshMeetings } = await useFetch<CouncilMeeting[]>('/api/council/meetings', {
  default: () => []
})

const roomMembers = computed(() => members.value?.filter(member => member.isActive) || [])
const transcript = computed(() => meeting.value?.messages || [])
const activeSpeaker = computed(() => [...transcript.value].reverse().find(message => message.role === 'agent'))
const hasActiveMeeting = computed(() => meeting.value?.status === 'active')
const roundLabel = computed(() => {
  if (!meeting.value?.state) {
    return 'Round 0/0'
  }
  return `Round ${meeting.value.state.rounds}/${meeting.value.state.maxRounds}`
})
const verdict = computed(() => meeting.value?.state?.verdict)

function seatStyle(index: number, total: number, color: string) {
  const angle = ((Math.PI * 2) / Math.max(total, 1)) * index - Math.PI / 2
  const radius = 32
  const x = 50 + (Math.cos(angle) * radius)
  const y = 50 + (Math.sin(angle) * radius)
  return {
    left: `${x}%`,
    top: `${y}%`,
    '--seat-color': color
  }
}

async function loadMeeting(id: string) {
  meeting.value = await $fetch(`/api/council/meetings/${id}`)
}

async function tickCouncil(userMessage?: string) {
  if (!selectedMeetingId.value || ticking.value || !hasActiveMeeting.value) {
    return
  }
  ticking.value = true
  try {
    const payload = userMessage?.trim() ? { userMessage: userMessage.trim() } : {}
    await $fetch(`/api/council/meetings/${selectedMeetingId.value}/tick`, {
      method: 'POST',
      body: payload
    })
    await loadMeeting(selectedMeetingId.value)
    await refreshMeetings()
  } catch (error: any) {
    toast.add({
      color: 'error',
      icon: 'i-lucide-alert-circle',
      description: error?.data?.statusMessage || error?.message || 'Failed to progress meeting.'
    })
  } finally {
    ticking.value = false
  }
}

async function startMeeting() {
  if (!topic.value.trim()) {
    return
  }
  creating.value = true
  try {
    const created = await $fetch<CouncilMeeting>('/api/council/meetings', {
      method: 'POST',
      body: {
        topic: topic.value,
        rounds: rounds.value
      }
    })
    await refreshMeetings()
    selectedMeetingId.value = created.id
    await loadMeeting(created.id)
    await tickCouncil()
  } finally {
    creating.value = false
  }
}

async function sendNudge() {
  if (!userNudge.value.trim()) {
    return
  }
  const nudge = userNudge.value
  userNudge.value = ''
  await tickCouncil(nudge)
}

async function stopMeeting() {
  if (!selectedMeetingId.value) {
    return
  }
  stopping.value = true
  try {
    await $fetch(`/api/council/meetings/${selectedMeetingId.value}/stop`, { method: 'POST' })
    await loadMeeting(selectedMeetingId.value)
    await refreshMeetings()
  } finally {
    stopping.value = false
  }
}

watch(meetings, async (value) => {
  if (!value?.length) {
    selectedMeetingId.value = undefined
    meeting.value = null
    return
  }
  if (!selectedMeetingId.value) {
    const preferred = value.find(item => item.status === 'active') || value[0]
    selectedMeetingId.value = preferred?.id
    if (preferred?.id) {
      await loadMeeting(preferred.id)
    }
  }
}, { immediate: true })

watch(selectedMeetingId, async (id) => {
  if (id) {
    await loadMeeting(id)
  } else {
    meeting.value = null
  }
})

onMounted(() => {
  timer = setInterval(() => {
    tickCouncil()
  }, 4200)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <div class="p-3 sm:p-5 h-full">
    <div class="flex items-center justify-between gap-3 mb-3">
      <div>
        <p class="text-sm text-muted">Council Chamber</p>
        <h1 class="text-2xl sm:text-3xl font-bold text-highlighted">Agent Roundtable</h1>
      </div>

      <USelect
        v-model="selectedMeetingId"
        :items="(meetings || []).map(item => ({ label: item.topic, value: item.id }))"
        placeholder="Select a meeting"
        class="w-full max-w-md"
      />
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 h-[calc(100%-5.2rem)]">
      <UCard class="council-card overflow-hidden">
        <div class="scene">
          <div class="room-glow" />

          <div class="round-pill">
            <UBadge color="neutral" variant="soft">{{ roundLabel }}</UBadge>
            <UBadge :color="hasActiveMeeting ? 'success' : 'neutral'" variant="soft">{{ meeting?.status || 'idle' }}</UBadge>
          </div>

          <div class="table-core">
            <div class="table-center">
              <p class="text-xs uppercase tracking-[0.3em] text-white/75">Meeting Topic</p>
              <p class="text-sm sm:text-base text-white font-semibold">{{ meeting?.topic || 'No meeting selected' }}</p>
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
            <p class="seat-name">{{ member.name }}</p>
            <p class="seat-title">{{ member.title }}</p>
            <div
              v-if="activeSpeaker?.member?.id === member.id"
              class="speech-bubble"
            >
              {{ activeSpeaker?.content }}
            </div>
          </div>

          <div v-if="!hasActiveMeeting" class="start-overlay">
            <UCard class="start-card">
              <template #header>
                <h2 class="font-semibold">Start Meeting</h2>
              </template>
              <div class="space-y-3">
                <UTextarea v-model="topic" :rows="3" placeholder="What should the council discuss?" />
                <div class="grid grid-cols-2 gap-2">
                  <UInput v-model.number="rounds" type="number" min="1" max="5" />
                  <UButton :loading="creating" icon="i-lucide-play" block @click="startMeeting">Start council</UButton>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </UCard>

      <div class="flex flex-col gap-4 min-h-0">
        <UCard class="council-card">
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

          <div class="transcript space-y-3">
            <div
              v-for="message in transcript"
              :key="message.id"
              class="line"
              :class="`role-${message.role}`"
            >
              <div class="line-head">
                <span class="font-semibold">
                  {{ message.role === 'agent' ? message.member?.name : message.role === 'user' ? 'You' : 'System' }}
                </span>
                <span class="text-xs text-muted">{{ new Date(message.createdAt).toLocaleTimeString() }}</span>
              </div>
              <p>{{ message.content }}</p>
            </div>
            <p v-if="transcript.length === 0" class="text-sm text-muted">No messages yet. Start a meeting to begin.</p>
          </div>
        </UCard>

        <UCard v-if="hasActiveMeeting" class="council-card">
          <template #header>
            <h2 class="font-semibold">Interrupt Council</h2>
          </template>
          <div class="space-y-3">
            <UTextarea
              v-model="userNudge"
              :rows="3"
              placeholder="Interrupt with new constraints or a direction change..."
            />
            <UButton icon="i-lucide-send" block variant="soft" @click="sendNudge">
              Send interruption
            </UButton>
          </div>
        </UCard>

        <UCard v-if="verdict" class="council-card">
          <template #header>
            <h2 class="font-semibold">Final Verdict</h2>
          </template>
          <div class="space-y-2 text-sm">
            <p><strong>Conclusion:</strong> {{ verdict.summary }}</p>
            <p><strong>Winning idea:</strong> {{ verdict.winningIdea }}</p>
            <p><strong>Vote:</strong> {{ verdict.voteResult }}</p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.council-card {
  background:
    radial-gradient(circle at 20% 10%, rgba(251, 191, 36, 0.14), transparent 38%),
    radial-gradient(circle at 85% 20%, rgba(59, 130, 246, 0.14), transparent 40%),
    color-mix(in srgb, var(--ui-bg) 90%, black);
  border: 1px solid color-mix(in srgb, var(--ui-border) 60%, transparent);
}

.scene {
  position: relative;
  min-height: 760px;
  border-radius: 1rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 40%, rgba(120, 53, 15, 0.62), rgba(23, 23, 23, 0.95)),
    linear-gradient(135deg, rgba(30, 64, 175, 0.28), rgba(120, 53, 15, 0.28));
}

.round-pill {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  gap: 0.4rem;
  z-index: 6;
}

.room-glow {
  position: absolute;
  inset: 10% 24%;
  border-radius: 9999px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.16), transparent 72%);
}

.table-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40%;
  aspect-ratio: 1 / 1;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  background:
    radial-gradient(circle at 30% 20%, rgba(180, 83, 9, 0.95), rgba(67, 20, 7, 0.95));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 8px 30px rgba(0, 0, 0, 0.45), 0 28px 40px rgba(0, 0, 0, 0.45);
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
}

.speaking .avatar-ring {
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--seat-color) 30%, transparent), 0 14px 28px rgba(0, 0, 0, 0.45);
}

.speech-bubble {
  margin: 0.5rem auto 0;
  width: 230px;
  background: rgba(255, 255, 255, 0.96);
  color: #111827;
  border-radius: 0.75rem;
  padding: 0.6rem 0.7rem;
  font-size: 0.8rem;
  line-height: 1.35;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.32);
}

.start-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 8;
  background: radial-gradient(circle at center, rgba(17, 24, 39, 0.22), rgba(17, 24, 39, 0.52));
}

.start-card {
  width: min(620px, 92%);
}

.transcript {
  max-height: 380px;
  overflow: auto;
}

.line {
  padding: 0.7rem 0.8rem;
  border-radius: 0.75rem;
  border: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg) 85%, black);
}

.line-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.2rem;
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
