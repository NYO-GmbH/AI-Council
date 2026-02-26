<script setup lang="ts">
import type { TabsItem, TimelineItem } from "@nuxt/ui";

interface CouncilMember {
  id: string;
  name: string;
  title: string;
  personality: string;
  objective: string;
  accentColor: string;
  isActive: boolean;
  createdAt: string;
}

interface MemberOutput {
  id: string;
  content: string;
  createdAt: string;
  meetingId: string;
  meetingTopic: string;
}

const toast = useToast();
const selectedMemberId = ref<string>();
const memberPanelOpen = ref(false);
const memberTabs = ref<TabsItem[]>([
  { label: "Roster", icon: "i-lucide-users", slot: "roster" },
  { label: "Active only", icon: "i-lucide-user-check", slot: "active" },
]);
const memberPanelTabs = ref<TabsItem[]>([
  { label: "Past Outputs", icon: "i-lucide-history", slot: "outputs" },
  { label: "Edit Member", icon: "i-lucide-pencil-line", slot: "profile" },
]);
const savingMember = ref(false);
const generatingMembers = ref(false);

const newMember = reactive({
  name: "",
  title: "",
  personality: "",
  objective: "",
  accentColor: "#3B82F6",
});

const memberDraft = reactive({
  name: "",
  title: "",
  personality: "",
  objective: "",
  accentColor: "#3B82F6",
  isActive: true,
});

const { data: members, refresh: refreshMembers } = await useFetch<
  CouncilMember[]
>("/api/council/members", {
  default: () => [],
});

const selectedMember = computed(() =>
  (members.value || []).find((member) => member.id === selectedMemberId.value),
);

const activeMembers = computed(() =>
  (members.value || []).filter((member) => member.isActive),
);

const { data: outputs, refresh: refreshOutputs } = await useFetch<
  MemberOutput[]
>(
  () =>
    selectedMemberId.value
      ? `/api/council/members/${selectedMemberId.value}/outputs`
      : "/api/council/members/none/outputs",
  {
    default: () => [],
    immediate: false,
  },
);

const outputTimelineItems = computed<TimelineItem[]>(() =>
  (outputs.value || []).map((output) => ({
    title: output.meetingTopic,
    date: formatDate(output.createdAt),
    description: output.content,
    icon: "i-lucide-message-square-text",
  })),
);

watch(
  members,
  async (value) => {
    if (!value?.length) {
      selectedMemberId.value = undefined;
      return;
    }
    if (!selectedMemberId.value) {
      selectedMemberId.value = value[0]!.id;
    }
  },
  { immediate: true },
);

watch(selectedMemberId, async (id) => {
  if (!id) {
    return;
  }
  try {
    await refreshOutputs();
  } catch {
    outputs.value = [];
  }
});

watch(
  selectedMember,
  (member) => {
    if (!member) {
      return;
    }

    Object.assign(memberDraft, {
      name: member.name,
      title: member.title,
      personality: member.personality,
      objective: member.objective,
      accentColor: member.accentColor,
      isActive: member.isActive,
    });
  },
  { immediate: true },
);

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function openMemberPanel(memberId: string) {
  selectedMemberId.value = memberId;
  memberPanelOpen.value = true;
}

async function createMember() {
  await $fetch("/api/council/members", {
    method: "POST",
    body: newMember,
  });
  Object.assign(newMember, {
    name: "",
    title: "",
    personality: "",
    objective: "",
    accentColor: "#3B82F6",
  });
  await refreshMembers();
  toast.add({ color: "success", description: "Council member created." });
}

async function generateSampleMembers() {
  generatingMembers.value = true;
  try {
    const result = await $fetch<{ created: number }>("/api/council/members/seed", {
      method: "POST",
    });
    await refreshMembers();
    if (result.created > 0) {
      toast.add({
        color: "success",
        description: `Generated ${result.created} sample members.`,
      });
      return;
    }
    toast.add({
      color: "neutral",
      description: "Sample members already exist.",
    });
  } finally {
    generatingMembers.value = false;
  }
}

async function updateMember(
  member: CouncilMember,
  patch: Partial<CouncilMember>,
) {
  await $fetch(`/api/council/members/${member.id}`, {
    method: "PATCH",
    body: patch,
  });
  await refreshMembers();
}

async function removeMember(member: CouncilMember) {
  await $fetch(`/api/council/members/${member.id}`, {
    method: "DELETE",
  });
  await refreshMembers();
  if (selectedMemberId.value === member.id) {
    selectedMemberId.value = members.value?.[0]?.id;
    await refreshOutputs();
  }
}

async function saveMemberEdits() {
  if (!selectedMember.value) {
    return;
  }

  savingMember.value = true;
  try {
    await updateMember(selectedMember.value, {
      name: memberDraft.name,
      title: memberDraft.title,
      personality: memberDraft.personality,
      objective: memberDraft.objective,
      accentColor: memberDraft.accentColor,
      isActive: memberDraft.isActive,
    });
    toast.add({ color: "success", description: "Member updated." });
  } finally {
    savingMember.value = false;
  }
}
</script>

<template>
  <div>
    <UContainer>
      <UPageHeader
        headline="Council Admin"
        title="Member Management"
        description="Create personas, tune voices, and manage who participates in meetings."
      >
        <template #links>
          <UButton
            icon="i-lucide-wand-sparkles"
            color="neutral"
            variant="soft"
            :loading="generatingMembers"
            @click="generateSampleMembers"
          >
            Generate sample members
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            @click="refreshMembers()"
          >
            Refresh
          </UButton>
        </template>
      </UPageHeader>

      <UPageBody>
        <UPageGrid class="gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <UCard variant="soft">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-base font-semibold">Create Member</h2>
                <UBadge color="neutral" variant="subtle">
                  {{ members.length }} total
                </UBadge>
              </div>
            </template>

            <UForm :state="newMember" class="space-y-4" @submit="createMember">
              <UFormField label="Name" required>
                <UInput
                  v-model="newMember.name"
                  placeholder="Astra"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Role title" required>
                <UInput
                  v-model="newMember.title"
                  placeholder="Strategist"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Personality and voice">
                <UTextarea
                  v-model="newMember.personality"
                  :rows="3"
                  placeholder="How this member speaks and thinks"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Primary objective">
                <UInput
                  v-model="newMember.objective"
                  placeholder="Drive practical decisions"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Accent color">
                <div class="grid grid-cols-[auto_1fr] items-center gap-3">
                  <UColorPicker v-model="newMember.accentColor" />
                  <UInput v-model="newMember.accentColor" class="w-full" />
                </div>
              </UFormField>

              <UCard variant="subtle">
                <div class="flex items-center gap-3">
                  <UAvatar
                    :alt="newMember.name || 'Council member'"
                    size="lg"
                  />
                  <div class="space-y-1">
                    <p class="font-medium">
                      {{ newMember.name || "Preview member" }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ newMember.title || "Role title" }}
                    </p>
                    <UBadge
                      color="neutral"
                      variant="outline"
                      class="align-middle"
                    >
                      {{ newMember.accentColor }}
                    </UBadge>
                  </div>
                </div>
              </UCard>

              <UButton
                type="submit"
                icon="i-lucide-user-plus"
                block
                :disabled="!newMember.name.trim() || !newMember.title.trim()"
              >
                Add council member
              </UButton>
            </UForm>
          </UCard>

          <UCard variant="soft">
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-base font-semibold">Council Members</h2>
                <div class="flex items-center gap-2">
                  <UBadge color="success" variant="subtle">
                    {{ activeMembers.length }} active
                  </UBadge>
                  <UBadge color="neutral" variant="subtle">
                    {{ members.length - activeMembers.length }} paused
                  </UBadge>
                </div>
              </div>
            </template>

            <UTabs :items="memberTabs" variant="link" color="neutral">
              <template #roster>
                <div class="space-y-3 pr-2">
                  <UEmpty
                    v-if="members.length === 0"
                    icon="i-lucide-users"
                    title="No members yet"
                    description="Create your first member from the panel on the left."
                    variant="naked"
                  />
                  <UCard
                    v-for="member in members"
                    :key="member.id"
                    :variant="
                      selectedMemberId === member.id ? 'soft' : 'subtle'
                    "
                    class="cursor-pointer transition ring-inset ring-1 ring-default"
                    @click="openMemberPanel(member.id)"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex min-w-0 items-center gap-2">
                        <span
                          class="h-2.5 w-2.5 shrink-0 rounded-full"
                          :style="{ backgroundColor: member.accentColor }"
                        />
                        <UUser
                          :name="member.name"
                          :description="member.title"
                          :avatar="{ alt: member.name }"
                        />
                      </div>

                      <div class="flex items-center gap-1" @click.stop>
                        <UTooltip
                          :text="
                            member.isActive ? 'Pause member' : 'Activate member'
                          "
                        >
                          <USwitch
                            :model-value="member.isActive"
                            @update:model-value="
                              (value) =>
                                updateMember(member, { isActive: !!value })
                            "
                          />
                        </UTooltip>
                        <UTooltip text="Delete member">
                          <UButton
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            @click="removeMember(member)"
                          />
                        </UTooltip>
                      </div>
                    </div>
                  </UCard>
                </div>
              </template>

              <template #active>
                <div class="space-y-3 pr-2">
                  <UEmpty
                    v-if="activeMembers.length === 0"
                    icon="i-lucide-user-x"
                    title="No active members"
                    description="Enable at least one member to include them in council runs."
                    variant="naked"
                  />
                  <UCard
                    v-for="member in activeMembers"
                    :key="member.id"
                    variant="subtle"
                    class="cursor-pointer transition ring-inset ring-1 ring-default"
                    @click="openMemberPanel(member.id)"
                  >
                    <div class="flex items-center gap-2">
                      <span
                        class="h-2.5 w-2.5 shrink-0 rounded-full"
                        :style="{ backgroundColor: member.accentColor }"
                      />
                      <UUser
                        :name="member.name"
                        :description="member.title"
                        :avatar="{ alt: member.name }"
                      />
                    </div>
                  </UCard>
                </div>
              </template>
            </UTabs>
          </UCard>
        </UPageGrid>
      </UPageBody>
    </UContainer>

    <USlideover
      v-model:open="memberPanelOpen"
      title="Member Panel"
      :description="selectedMember?.name || 'No member selected'"
      side="right"
      :ui="{ content: 'max-w-xl w-full' }"
    >
      <template #body>
        <UTabs :items="memberPanelTabs" color="neutral" variant="link">
          <template #outputs>
            <UEmpty
              v-if="!selectedMemberId"
              icon="i-lucide-message-square-off"
              title="Select a member"
              description="Choose a council member to browse their outputs."
            />
            <UEmpty
              v-else-if="outputs.length === 0"
              icon="i-lucide-inbox"
              title="No outputs yet"
              description="This member hasn't produced any responses yet."
            />
            <UScrollArea v-else class="h-[calc(100vh-13rem)] pr-1">
              <UTimeline
                :items="outputTimelineItems"
                size="xs"
                color="primary"
                class="pr-3"
              />
            </UScrollArea>
          </template>

          <template #profile>
            <UEmpty
              v-if="!selectedMember"
              icon="i-lucide-user-round-x"
              title="No member selected"
              description="Choose a member from the list to edit their profile."
            />
            <UForm
              v-else
              :state="memberDraft"
              class="space-y-4"
              @submit="saveMemberEdits"
            >
              <UFormField label="Name" required>
                <UInput v-model="memberDraft.name" class="w-full" />
              </UFormField>
              <UFormField label="Role title" required>
                <UInput v-model="memberDraft.title" class="w-full" />
              </UFormField>
              <UFormField label="Personality and voice">
                <UTextarea
                  v-model="memberDraft.personality"
                  :rows="3"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Primary objective">
                <UInput v-model="memberDraft.objective" class="w-full" />
              </UFormField>
              <UFormField label="Accent color">
                <div class="grid grid-cols-[auto_1fr] items-center gap-3">
                  <UColorPicker v-model="memberDraft.accentColor" />
                  <UInput v-model="memberDraft.accentColor" class="w-full" />
                </div>
              </UFormField>
              <UFormField label="Active in council">
                <USwitch v-model="memberDraft.isActive" />
              </UFormField>
              <UButton
                type="submit"
                icon="i-lucide-save"
                :loading="savingMember"
                block
              >
                Save changes
              </UButton>
            </UForm>
          </template>
        </UTabs>
      </template>
    </USlideover>
  </div>
</template>
