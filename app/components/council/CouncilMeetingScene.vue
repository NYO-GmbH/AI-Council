<script setup lang="ts">
import type { CouncilMember, CouncilMeeting } from '~/composables/council/types'

const props = defineProps<{
  meeting: CouncilMeeting | null
  roomMembers: CouncilMember[]
  activeSpeaker?: { member: { id: string } | null }
  highlightedMemberId?: string
  roundLabel: string
  hasActiveMeeting: boolean
}>()

const statusLabels: Record<string, string> = {
  active: 'aktiv',
  paused: 'pausiert',
  completed: 'abgeschlossen',
  idle: 'inaktiv',
}

function translateStatus(status: string) {
  return statusLabels[status] ?? status
}

function seatStyle(index: number, total: number, color: string) {
  const angle = ((Math.PI * 2) / Math.max(total, 1)) * index - Math.PI / 2
  const radius = 28
  const x = 50 + Math.cos(angle) * radius
  const y = 50 + Math.sin(angle) * radius

  return {
    'left': `${x}%`,
    'top': `${y}%`,
    '--seat-color': color
  }
}
</script>

<template>
  <UCard variant="soft" class="overflow-hidden">
    <div class="scene">
      <div class="room-glow" />

      <div class="round-pill">
        <UBadge color="neutral" variant="soft">
          {{ props.roundLabel }}
        </UBadge>
        <UBadge :color="props.hasActiveMeeting ? 'success' : 'neutral'" variant="soft">
          {{ translateStatus(props.meeting?.status || 'idle') }}
        </UBadge>
        <UBadge color="neutral" variant="outline">
          {{ props.roomMembers.length }} aktive Mitglieder
        </UBadge>
      </div>

      <div class="table-core">
        <div class="table-center">
          <p class="text-xs uppercase tracking-[0.3em] text-white/75">
            Sitzungsthema
          </p>
          <p class="text-sm font-semibold text-white sm:text-base">
            {{ props.meeting?.topic || 'Keine Sitzung ausgewählt' }}
          </p>
        </div>
      </div>

      <div
        v-for="(member, index) in props.roomMembers"
        :key="member.id"
        class="seat"
        :style="seatStyle(index, props.roomMembers.length, member.accentColor)"
        :class="{
          speaking: props.activeSpeaker?.member?.id === member.id,
          highlighted: props.highlightedMemberId === member.id
        }"
      >
        <div class="avatar-shell">
          <div class="seat-ping" />
          <div class="avatar-ring">
            <span>{{ member.name.slice(0, 1).toUpperCase() }}</span>
          </div>
        </div>
        <p class="seat-name">
          {{ member.name }}
        </p>
        <p class="seat-title">
          {{ member.title }}
        </p>
      </div>

    </div>
  </UCard>
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
  transition: transform 220ms ease;
  z-index: 4;
}

.avatar-shell {
  position: relative;
  width: 70px;
  height: 70px;
  margin: 0 auto;
}

.seat-ping {
  position: absolute;
  inset: -7px;
  border-radius: 9999px;
  border: 2px solid color-mix(in srgb, var(--seat-color) 75%, white);
  opacity: 0;
  pointer-events: none;
}

.avatar-ring {
  position: relative;
  width: 100%;
  height: 100%;
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

.highlighted:not(.speaking) {
  transform: translate(-50%, -53%) scale(1.03);
  z-index: 8;
}

.speaking .avatar-ring {
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.45);
}

.highlighted .avatar-ring {
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.45);
}

.speaking .seat-ping {
  animation: speaker-ping 1.3s ease-out infinite;
}

.highlighted .seat-ping {
  animation: speaker-ping 1.3s ease-out infinite;
}

@keyframes speaker-ping {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  70% {
    opacity: 0;
    transform: scale(1.4);
  }
  100% {
    opacity: 0;
    transform: scale(1.4);
  }
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

  .avatar-shell {
    width: 56px;
    height: 56px;
  }
}
</style>
