import { getMeetingWithMessagesOrThrow } from '~~/server/utils/council/meetings'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  return getMeetingWithMessagesOrThrow(id as string)
})
