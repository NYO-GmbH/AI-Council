import type {
  CouncilMeeting,
  CouncilMember,
  CouncilMessage,
  TickStreamEvent
} from './council/types'

export function useCouncilMeeting() {
  const toast = useToast()

  const selectedMeetingId = ref<string>()
  const meeting = ref<CouncilMeeting | null>(null)
  const topic = ref('Plan our next product sprint with clear owner decisions.')
  const userNudge = ref('')
  const creating = ref(false)
  const ticking = ref(false)
  const stopping = ref(false)
  const deleting = ref(false)
  const rounds = ref(2)
  const verdictOpen = ref(false)
  const shouldAutoTick = ref(false)

  const { data: members } = useFetch<CouncilMember[]>(
    '/api/council/members',
    {
      default: () => []
    }
  )

  const { data: meetings, refresh: refreshMeetings } = useFetch<
    CouncilMeeting[]
  >('/api/council/meetings', {
    default: () => []
  })

  const meetingOptions = computed(() =>
    (meetings.value || []).map(item => ({
      label: item.topic,
      value: item.id
    }))
  )

  const roomMembers = computed(
    () => members.value?.filter(member => member.isActive) || []
  )
  const transcript = computed(() => meeting.value?.messages || [])
  const activeSpeaker = computed(() =>
    meeting.value?.status === 'active'
      ? [...transcript.value]
          .reverse()
          .find(message => message.role === 'agent')
      : undefined
  )
  const hasActiveMeeting = computed(() => meeting.value?.status === 'active')
  const roundLabel = computed(() => {
    if (!meeting.value?.state) {
      return 'Round 0/0'
    }
    return `Round ${meeting.value.state.rounds}/${meeting.value.state.maxRounds}`
  })
  const verdict = computed(() => meeting.value?.state?.verdict)

  async function loadMeeting(id: string) {
    meeting.value = await $fetch(`/api/council/meetings/${id}`)
  }

  function upsertStreamingMessage(
    content: string,
    member: CouncilMember | null
  ) {
    if (!meeting.value) {
      return
    }
    const streamId = '__streaming__'
    if (!meeting.value.messages) {
      meeting.value.messages = []
    }
    const existingIndex = meeting.value.messages.findIndex(
      message => message.id === streamId
    )
    const streamingMessage: CouncilMessage = {
      id: streamId,
      role: 'agent',
      content,
      createdAt: new Date().toISOString(),
      member
    }

    if (existingIndex === -1) {
      meeting.value.messages.push(streamingMessage)
      return
    }

    const existingMessage = meeting.value.messages[existingIndex]
    if (!existingMessage) {
      meeting.value.messages.push(streamingMessage)
      return
    }

    meeting.value.messages.splice(existingIndex, 1, {
      id: existingMessage.id,
      role: existingMessage.role,
      content,
      createdAt: existingMessage.createdAt,
      member
    })
  }

  function removeStreamingMessage() {
    if (!meeting.value?.messages) {
      return
    }
    meeting.value.messages = meeting.value.messages.filter(
      message => message.id !== '__streaming__'
    )
  }

  async function tickCouncil(userMessage?: string) {
    if (!selectedMeetingId.value || ticking.value || !hasActiveMeeting.value) {
      return
    }
    ticking.value = true
    try {
      const payload = userMessage?.trim()
        ? { userMessage: userMessage.trim() }
        : {}
      const response = await fetch(
        `/api/council/meetings/${selectedMeetingId.value}/tick`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )
      if (!response.ok) {
        const failure = await response.text()
        let message = 'Failed to progress meeting.'
        if (failure) {
          try {
            const parsed = JSON.parse(failure) as { statusMessage?: string }
            message = parsed.statusMessage || message
          } catch {
            message = failure
          }
        }
        throw new Error(message)
      }

      if (!response.body) {
        await loadMeeting(selectedMeetingId.value)
        await refreshMeetings()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamMember: CouncilMember | null = null

      const consumeEvent = (line: string) => {
        if (!line.trim()) {
          return
        }
        const event = JSON.parse(line) as TickStreamEvent
        if (event.type === 'speaker') {
          streamMember = {
            ...event.member,
            isActive: true
          }
          upsertStreamingMessage('', streamMember)
          return
        }
        if (event.type === 'message_content') {
          upsertStreamingMessage(event.content, streamMember)
          return
        }
        if (event.type === 'message') {
          removeStreamingMessage()
          if (!meeting.value) {
            return
          }
          if (!meeting.value.messages) {
            meeting.value.messages = []
          }
          meeting.value.messages.push(event.message)
          return
        }
        if (
          event.type === 'status'
          && event.status === 'completed'
          && meeting.value
        ) {
          meeting.value.status = 'completed'
        }
        if (event.type === 'error') {
          throw new Error(event.message)
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          consumeEvent(line)
        }
      }
      const tail = buffer.trim()
      if (tail) {
        consumeEvent(tail)
      }
      removeStreamingMessage()
      await loadMeeting(selectedMeetingId.value)
      await refreshMeetings()
    } catch (error: unknown) {
      removeStreamingMessage()
      const err = error as {
        data?: { statusMessage?: string }
        message?: string
      }
      toast.add({
        color: 'error',
        icon: 'i-lucide-alert-circle',
        description:
          err?.data?.statusMessage
          || err?.message
          || 'Failed to progress meeting.'
      })
    } finally {
      ticking.value = false
      if (
        shouldAutoTick.value
        && selectedMeetingId.value
        && hasActiveMeeting.value
      ) {
        void tickCouncil()
      }
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
      await $fetch(`/api/council/meetings/${selectedMeetingId.value}/stop`, {
        method: 'POST'
      })
      await loadMeeting(selectedMeetingId.value)
      await refreshMeetings()
    } finally {
      stopping.value = false
    }
  }

  async function deleteMeeting() {
    if (!selectedMeetingId.value || deleting.value) {
      return
    }

    const targetId = selectedMeetingId.value

    deleting.value = true
    try {
      await $fetch(`/api/council/meetings/${targetId}`, {
        method: 'DELETE'
      })

      await refreshMeetings()
      const updatedMeetings = meetings.value || []
      const next
        = updatedMeetings.find(item => item.status === 'active')
          || updatedMeetings[0]

      selectedMeetingId.value = next?.id
      if (next?.id) {
        await loadMeeting(next.id)
      } else {
        meeting.value = null
      }

      toast.add({
        color: 'success',
        icon: 'i-lucide-trash-2',
        description: 'Meeting deleted.'
      })
    } catch (error: unknown) {
      const err = error as {
        data?: { statusMessage?: string }
        message?: string
      }
      toast.add({
        color: 'error',
        icon: 'i-lucide-alert-circle',
        description:
          err?.data?.statusMessage
          || err?.message
          || 'Failed to delete meeting.'
      })
    } finally {
      deleting.value = false
    }
  }

  watch(
    meetings,
    async (value) => {
      if (!value?.length) {
        selectedMeetingId.value = undefined
        meeting.value = null
        return
      }
      if (!selectedMeetingId.value) {
        const preferred
          = value.find(item => item.status === 'active') || value[0]
        selectedMeetingId.value = preferred?.id
        if (preferred?.id) {
          await loadMeeting(preferred.id)
        }
      }
    },
    { immediate: true }
  )

  watch(selectedMeetingId, async (id) => {
    if (id) {
      await loadMeeting(id)
    } else {
      meeting.value = null
    }
  })

  watch(hasActiveMeeting, (active) => {
    if (
      active
      && shouldAutoTick.value
      && selectedMeetingId.value
      && !ticking.value
    ) {
      void tickCouncil()
    }
  })

  const isInitialVerdictWatch = ref(true)
  watch(verdict, (value, previous) => {
    if (isInitialVerdictWatch.value) {
      isInitialVerdictWatch.value = false
      return
    }
    if (value && !previous) {
      verdictOpen.value = true
    }
  })

  onMounted(() => {
    shouldAutoTick.value = true
    if (hasActiveMeeting.value && selectedMeetingId.value) {
      void tickCouncil()
    }
  })

  onUnmounted(() => {
    shouldAutoTick.value = false
  })

  return {
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
  }
}
