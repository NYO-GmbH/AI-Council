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

export interface MeetingVerdict {
  summary: string
  winningIdea: string
  voteResult: string
}

export interface MeetingState {
  queue: string[]
  rounds: number
  maxRounds: number
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
