export type TickStreamEvent
  = | {
    type: 'status'
    status: 'completed' | 'paused' | 'idle'
    verdict?: unknown
  }
  | {
    type: 'speaker'
    member: {
      id: string
      name: string
      title: string
      accentColor: string
    }
  }
  | {
    type: 'message_content'
    content: string
  }
  | {
    type: 'message'
    message: {
      id: string
      meetingId: string
      memberId: string | null
      role: 'agent'
      content: string
      createdAt: Date
      member: {
        id: string
        name: string
        title: string
        accentColor: string
      }
    }
  }
  | {
    type: 'error'
    message: string
  }

const NDJSON_HEADERS = {
  'content-type': 'application/x-ndjson; charset=utf-8',
  'cache-control': 'no-cache, no-transform'
}

export function toSingleEventResponse(payload: TickStreamEvent) {
  return new Response(JSON.stringify(payload), {
    headers: NDJSON_HEADERS
  })
}

export function toStreamingResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      ...NDJSON_HEADERS,
      connection: 'keep-alive'
    }
  })
}
