import { generateText } from 'ai'
import { defaultModel } from '../lmstudio'
import { clipText } from './text'

export interface CouncilVerdict {
  summary: string
  winningIdea: string
  voteResult: string
}

export async function generateVerdict(topic: string, transcript: string) {
  const { text } = await generateText({
    model: defaultModel,
    system: `You are a neutral council moderator.
Create a concise final summary and a vote result.
Return plain text in this exact format:
SUMMARY: <1-2 sentences>
WINNING_IDEA: <single sentence>
VOTE_RESULT: <example "Astra 3, Forge 2, Lumen 1">`,
    prompt: `Meeting topic: ${topic}\n\nTranscript:\n${transcript || 'No transcript.'}`
  })

  const lines = text.split('\n').map(line => line.trim())
  const summary
    = lines
      .find(line => line.startsWith('SUMMARY:'))
      ?.replace('SUMMARY:', '')
      .trim() || 'The council discussion is complete.'
  const winningIdea
    = lines
      .find(line => line.startsWith('WINNING_IDEA:'))
      ?.replace('WINNING_IDEA:', '')
      .trim() || 'No clear winning idea was identified.'
  const voteResult
    = lines
      .find(line => line.startsWith('VOTE_RESULT:'))
      ?.replace('VOTE_RESULT:', '')
      .trim() || 'No vote result available.'

  return {
    summary: clipText(summary, 420),
    winningIdea: clipText(winningIdea, 220),
    voteResult: clipText(voteResult, 220)
  } satisfies CouncilVerdict
}
