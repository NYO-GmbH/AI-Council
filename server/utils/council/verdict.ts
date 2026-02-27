import { generateText } from 'ai'
import { defaultModel } from '../lmstudio'
import { clipText } from './text'

export interface VerdictMemberInput {
  id: string
  name: string
  title: string
  accentColor: string
}

export interface CouncilVerdictStatement {
  memberId: string
  memberName: string
  memberTitle: string
  accentColor: string
  statement: string
}

export interface CouncilVoteExplanation {
  memberId: string
  memberName: string
  memberTitle: string
  accentColor: string
  votedForMemberId: string
  votedForMemberName: string
  reason: string
}

export interface CouncilVerdict {
  summary: string
  winningIdea: string
  voteResult: string
  finalStatements: CouncilVerdictStatement[]
  voteExplanations: CouncilVoteExplanation[]
}

export function buildVoteResult(votes: CouncilVoteExplanation[]) {
  const counts = new Map<string, number>()

  for (const vote of votes) {
    const key = vote.votedForMemberName
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} ${count}`)
    .join(', ')
}

function findTopVotedName(votes: CouncilVoteExplanation[]) {
  const counts = new Map<string, number>()
  for (const vote of votes) {
    counts.set(vote.votedForMemberName, (counts.get(vote.votedForMemberName) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export async function generateVerdict(
  topic: string,
  transcript: string,
  finalStatements: CouncilVerdictStatement[],
  voteExplanations: CouncilVoteExplanation[]
) {
  const statementSummary = finalStatements
    .map(statement => `${statement.memberName}: ${statement.statement}`)
    .join('\n')
  const voteSummary = voteExplanations
    .map(vote => `${vote.memberName} -> ${vote.votedForMemberName}: ${vote.reason}`)
    .join('\n')

  const { text } = await generateText({
    model: defaultModel,
    system: `You are a neutral council moderator.
Create a concise final summary and identify the winning idea.
Return plain text in this exact format:
SUMMARY: <1-2 sentences>
WINNING_IDEA: <single sentence>`,
    prompt: `Meeting topic: ${topic}

Transcript:
${transcript || 'No transcript.'}

Final verdict statements:
${statementSummary || 'None.'}

Voting explanations:
${voteSummary || 'None.'}`
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
      .trim()

  const voteResult = buildVoteResult(voteExplanations) || 'No vote result available.'
  const topVotedName = findTopVotedName(voteExplanations)

  return {
    summary: clipText(summary, 420),
    winningIdea: clipText(
      winningIdea
      || (topVotedName
        ? `${topVotedName}'s proposal received the strongest support.`
        : 'No clear winning idea was identified.'),
      220
    ),
    voteResult: clipText(voteResult, 220),
    finalStatements,
    voteExplanations
  } satisfies CouncilVerdict
}
