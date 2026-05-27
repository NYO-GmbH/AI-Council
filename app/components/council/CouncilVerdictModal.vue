<script setup lang="ts">
import type {
  FinalPhaseStreamEntry,
  MeetingState,
  MeetingVerdict
} from '~/composables/council/types'

const props = defineProps<{
  open: boolean
  verdict?: MeetingVerdict
  phase?: MeetingState['phase']
  liveSpeaker?: {
    id: string
    name: string
    title: string
    accentColor: string
  } | null
  liveContent?: string
  liveEntries?: FinalPhaseStreamEntry[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const livePhaseLabel = computed(() => {
  if (props.phase === 'final_verdicts') {
    return 'Abschlussurteile werden generiert'
  }
  if (props.phase === 'voting') {
    return 'Abstimmung läuft'
  }
  return 'Finale Phase läuft'
})

const finalStatements = computed(() => props.verdict?.finalStatements || [])
const voteExplanations = computed(() => props.verdict?.voteExplanations || [])

const votesByTarget = computed(() => {
  const grouped = new Map<string, typeof voteExplanations.value>()
  for (const vote of voteExplanations.value) {
    const list = grouped.get(vote.votedForMemberId) || []
    list.push(vote)
    grouped.set(vote.votedForMemberId, list)
  }
  return grouped
})

const winningStatementMemberId = computed(() => {
  let winnerId = ''
  let maxVotes = -1

  for (const statement of finalStatements.value) {
    const count = votesByTarget.value.get(statement.memberId)?.length || 0
    if (count > maxVotes) {
      maxVotes = count
      winnerId = statement.memberId
    }
  }

  return winnerId
})

function initials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Abschlussurteil" :ui="{ content: 'sm:max-w-5xl' }">
    <template #body>
      <div
        v-if="!props.verdict && (props.phase === 'final_verdicts' || props.phase === 'voting')"
        class="space-y-4 text-sm"
      >
        <div class="flex items-center justify-between gap-2">
          <UBadge color="primary" variant="soft">
            {{ livePhaseLabel }}
          </UBadge>
          <UBadge color="neutral" variant="outline">
            {{ props.liveEntries?.length || 0 }} abgeschlossen
          </UBadge>
        </div>

        <UCard variant="subtle">
          <template #header>
            <div class="flex items-center gap-2">
              <div
                v-if="props.liveSpeaker"
                class="member-icon"
                :style="{ '--member-accent': props.liveSpeaker.accentColor }"
              >
                {{ initials(props.liveSpeaker.name) }}
              </div>
              <div>
                <p class="font-semibold text-sm">
                  {{ props.liveSpeaker?.name || 'Ratsmitglied' }}
                </p>
                <p class="text-xs text-muted">
                  {{ props.liveSpeaker?.title || 'Stellungnahme wird vorbereitet...' }}
                </p>
              </div>
            </div>
          </template>

          <p class="text-sm leading-relaxed min-h-12">
            {{ props.liveContent || 'Wird überlegt...' }}
          </p>
        </UCard>

        <div class="space-y-2 max-h-80 overflow-auto pr-1">
          <UCard
            v-for="entry in (props.liveEntries || []).slice().reverse()"
            :key="entry.id"
            variant="soft"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="member-icon tiny" :style="{ '--member-accent': entry.member.accentColor }">
                  {{ initials(entry.member.name) }}
                </div>
                <span class="text-xs font-semibold">
                  {{ entry.member.name }}
                </span>
              </div>
              <UBadge :color="entry.phase === 'voting' ? 'warning' : 'info'" variant="soft" size="sm">
                {{ entry.phase === 'voting' ? 'Abstimmung' : 'Abschlussurteil' }}
              </UBadge>
            </div>
            <p class="text-sm leading-relaxed">
              {{ entry.content }}
            </p>
          </UCard>
        </div>
      </div>

      <div v-else-if="props.verdict" class="space-y-4 text-sm">
        <div class="flex items-center justify-end gap-2">
          <UBadge color="neutral" variant="soft">
            {{ finalStatements.length }} Abschlussurteile
          </UBadge>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <UCard
            v-for="statement in finalStatements"
            :key="statement.memberId"
            variant="soft"
            class="statement-card"
            :class="{ winner: statement.memberId === winningStatementMemberId }"
            :style="{ '--card-accent': statement.accentColor }"
          >
            <UIcon
              v-if="statement.memberId === winningStatementMemberId"
              name="i-lucide-crown"
              class="winner-crown"
            />
            <div class="mb-2 flex items-center gap-2">
              <div class="member-icon">
                {{ initials(statement.memberName) }}
              </div>
              <div>
                <p class="font-semibold text-sm leading-tight">
                  {{ statement.memberName }}
                </p>
                <p class="text-xs text-muted leading-tight">
                  {{ statement.memberTitle }}
                </p>
              </div>
            </div>
            <p class="text-sm leading-relaxed">
              {{ statement.statement }}
            </p>
            <div class="mt-3 border-t border-default pt-2">
              <p class="text-[11px] uppercase tracking-[0.12em] text-muted mb-1">
                Gewählt von
              </p>
              <div class="flex flex-wrap items-center gap-1.5">
                <UPopover
                  v-for="vote in votesByTarget.get(statement.memberId) || []"
                  :key="vote.memberId"
                  mode="hover"
                >
                  <div
                    class="member-icon tiny cursor-help"
                    :style="{ '--member-accent': vote.accentColor }"
                  >
                    {{ initials(vote.memberName) }}
                  </div>

                  <template #content>
                    <div class="vote-popover">
                      <p class="font-semibold text-xs">
                        {{ vote.memberName }}
                      </p>
                      <p class="text-xs mt-1 whitespace-normal break-words">
                        {{ vote.reason }}
                      </p>
                    </div>
                  </template>
                </UPopover>
                <span
                  v-if="!(votesByTarget.get(statement.memberId) || []).length"
                  class="text-xs text-muted"
                >
                  Keine Stimmen
                </span>
              </div>
            </div>
          </UCard>
        </div>
      </div>
      <UEmpty
        v-else
        icon="i-lucide-hourglass"
        title="Noch kein Urteil"
        description="Der Rat wird ein Abschlussurteil veröffentlichen, wenn die Beratung abgeschlossen ist."
      />
    </template>
  </UModal>
</template>

<style scoped>
.statement-card {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--card-accent) 38%, var(--ui-border));
}

.statement-card.winner {
  border-color: color-mix(in srgb, #f59e0b 70%, var(--card-accent));
  box-shadow:
    0 0 0 1px rgba(245, 158, 11, 0.32),
    0 0 28px rgba(245, 158, 11, 0.25);
}

.winner-crown {
  position: absolute;
  right: 0.7rem;
  top: 0.7rem;
  color: #fbbf24;
  width: 1rem;
  height: 1rem;
}

.member-icon {
  --member-accent: var(--card-accent, #64748b);
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  background: color-mix(in srgb, var(--member-accent) 72%, black);
  border: 2px solid color-mix(in srgb, var(--member-accent) 68%, white);
}

.member-icon.tiny {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.58rem;
  border-width: 1px;
}

.vote-popover {
  max-width: 18rem;
  padding: 0.65rem;
}
</style>
