<script setup lang="ts">
interface CouncilMember {
  id: string
  name: string
  title: string
  personality: string
  objective: string
  accentColor: string
  isActive: boolean
  createdAt: string
}

interface MemberOutput {
  id: string
  content: string
  createdAt: string
  meetingId: string
  meetingTopic: string
}

const toast = useToast()
const selectedMemberId = ref<string>()

const newMember = reactive({
  name: '',
  title: '',
  personality: '',
  objective: '',
  accentColor: '#3B82F6'
})

const { data: members, refresh: refreshMembers } = await useFetch<CouncilMember[]>('/api/council/members', {
  default: () => []
})

const selectedMember = computed(() => (members.value || []).find(member => member.id === selectedMemberId.value))

const { data: outputs, refresh: refreshOutputs } = await useFetch<MemberOutput[]>(
  () => selectedMemberId.value ? `/api/council/members/${selectedMemberId.value}/outputs` : '/api/council/members/none/outputs',
  {
    default: () => [],
    immediate: false
  }
)

watch(members, async (value) => {
  if (!value?.length) {
    selectedMemberId.value = undefined
    return
  }
  if (!selectedMemberId.value) {
    selectedMemberId.value = value[0]!.id
  }
}, { immediate: true })

watch(selectedMemberId, async (id) => {
  if (!id) {
    return
  }
  try {
    await refreshOutputs()
  } catch {
    outputs.value = []
  }
})

async function createMember() {
  await $fetch('/api/council/members', {
    method: 'POST',
    body: newMember
  })
  Object.assign(newMember, {
    name: '',
    title: '',
    personality: '',
    objective: '',
    accentColor: '#3B82F6'
  })
  await refreshMembers()
  toast.add({ color: 'success', description: 'Council member created.' })
}

async function updateMember(member: CouncilMember, patch: Partial<CouncilMember>) {
  await $fetch(`/api/council/members/${member.id}`, {
    method: 'PATCH',
    body: patch
  })
  await refreshMembers()
}

async function removeMember(member: CouncilMember) {
  await $fetch(`/api/council/members/${member.id}`, {
    method: 'DELETE'
  })
  await refreshMembers()
  if (selectedMemberId.value === member.id) {
    selectedMemberId.value = members.value?.[0]?.id
    await refreshOutputs()
  }
}
</script>

<template>
  <div class="p-3 sm:p-5">
    <div class="mb-3">
      <p class="text-sm text-muted">Council Admin</p>
      <h1 class="text-2xl sm:text-3xl font-bold text-highlighted">Member Management</h1>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-4">
      <UCard class="council-card">
        <template #header>
          <h2 class="font-semibold">Create Member</h2>
        </template>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <UInput v-model="newMember.name" placeholder="Name" />
            <UInput v-model="newMember.title" placeholder="Role title" />
          </div>
          <UTextarea v-model="newMember.personality" :rows="2" placeholder="Personality and voice" />
          <UInput v-model="newMember.objective" placeholder="Primary objective" />
          <UInput v-model="newMember.accentColor" placeholder="#3B82F6" />
          <UButton icon="i-lucide-user-plus" block @click="createMember">Add council member</UButton>
        </div>
      </UCard>

      <UCard class="council-card">
        <template #header>
          <h2 class="font-semibold">Council Members</h2>
        </template>
        <div class="space-y-2 max-h-[320px] overflow-auto">
          <button
            v-for="member in members"
            :key="member.id"
            class="member-row"
            :class="{ selected: selectedMemberId === member.id }"
            @click="selectedMemberId = member.id"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="dot" :style="{ backgroundColor: member.accentColor }" />
              <div class="min-w-0 text-left">
                <p class="truncate font-medium">{{ member.name }}</p>
                <p class="truncate text-xs text-muted">{{ member.title }}</p>
              </div>
            </div>
            <div class="flex items-center gap-1" @click.stop>
              <USwitch
                :model-value="member.isActive"
                @update:model-value="value => updateMember(member, { isActive: !!value })"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                @click="removeMember(member)"
              />
            </div>
          </button>
        </div>
      </UCard>
    </div>

    <UCard class="council-card mt-4">
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">Past Outputs</h2>
          <span class="text-sm text-muted">{{ selectedMember?.name || 'No member selected' }}</span>
        </div>
      </template>

      <div class="space-y-3 max-h-[520px] overflow-auto">
        <div v-for="output in outputs" :key="output.id" class="output-row">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-muted truncate">{{ output.meetingTopic }}</p>
            <span class="text-xs text-muted">{{ new Date(output.createdAt).toLocaleString() }}</span>
          </div>
          <p class="text-sm">{{ output.content }}</p>
        </div>
        <p v-if="!outputs?.length" class="text-sm text-muted">No outputs yet for this member.</p>
      </div>
    </UCard>
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

.member-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  padding: 0.5rem 0.6rem;
  background: color-mix(in srgb, var(--ui-bg) 84%, black);
}

.member-row.selected {
  border-color: color-mix(in srgb, var(--ui-primary) 50%, var(--ui-border));
}

.dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

.output-row {
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  padding: 0.65rem 0.75rem;
  background: color-mix(in srgb, var(--ui-bg) 84%, black);
}
</style>
