export interface CouncilMember {
  id: string
  name: string
  title: string
  accentColor: string
  isActive: boolean
}

export interface CouncilMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  createdAt: string
  member: CouncilMember | null
}

export interface FinalPhaseStreamEntry {
  id: string
  phase: 'final_verdicts' | 'voting'
  content: string
  createdAt: string
  member: Pick<CouncilMember, 'id' | 'name' | 'title' | 'accentColor'>
}

export interface MeetingVerdict {
  summary: string
  winningIdea: string
  voteResult: string
  finalStatements: {
    memberId: string
    memberName: string
    memberTitle: string
    accentColor: string
    statement: string
  }[]
  voteExplanations: {
    memberId: string
    memberName: string
    memberTitle: string
    accentColor: string
    votedForMemberId: string
    votedForMemberName: string
    reason: string
  }[]
}

export interface MeetingState {
  queue: string[]
  rounds: number
  maxRounds: number
  phase?: 'discussion' | 'final_verdicts' | 'voting' | 'completed'
  concluded?: boolean
  verdict?: MeetingVerdict
}

export interface CouncilMeeting {
  id: string
  topic: string
  status: 'active' | 'paused' | 'completed'
  createdAt: string
  state: MeetingState
  messages?: CouncilMessage[]
}

export type TickStreamEvent
  = | {
    type: 'status'
    status: 'completed' | 'paused' | 'idle'
    verdict?: MeetingVerdict | null
  }
  | {
    type: 'phase'
    phase: 'discussion' | 'final_verdicts' | 'voting' | 'completed'
  }
  | {
    type: 'speaker'
    member: Pick<CouncilMember, 'id' | 'name' | 'title' | 'accentColor'>
  }
  | {
    type: 'message_content'
    content: string
  }
  | {
    type: 'message'
    message: CouncilMessage
  }
  | {
    type: 'error'
    message: string
  }
