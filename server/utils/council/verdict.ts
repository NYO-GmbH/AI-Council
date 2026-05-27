import { generateText } from 'ai'
import { getModel } from '../lmstudio'
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
    model: await getModel(),
    system: `Du bist ein neutraler Ratsmoderator.
Erstelle eine prägnante Abschlusszusammenfassung und identifiziere die Gewinneridee.
Antworte auf Deutsch in genau diesem Format:
ZUSAMMENFASSUNG: <1-2 Sätze>
GEWINNERIDEE: <ein Satz>`,
    prompt: `Sitzungsthema: ${topic}

Protokoll:
${transcript || 'Kein Protokoll.'}

Abschlussurteile:
${statementSummary || 'Keine.'}

Abstimmungserklärungen:
${voteSummary || 'Keine.'}`
  })

  const lines = text.split('\n').map(line => line.trim())
  const summary
    = lines
      .find(line => line.startsWith('ZUSAMMENFASSUNG:'))
      ?.replace('ZUSAMMENFASSUNG:', '')
      .trim() || 'Die Ratsdiskussion ist abgeschlossen.'
  const winningIdea
    = lines
      .find(line => line.startsWith('GEWINNERIDEE:'))
      ?.replace('GEWINNERIDEE:', '')
      .trim()

  const voteResult = buildVoteResult(voteExplanations) || 'Kein Abstimmungsergebnis verfügbar.'
  const topVotedName = findTopVotedName(voteExplanations)

  return {
    summary: clipText(summary, 420),
    winningIdea: clipText(
      winningIdea
      || (topVotedName
        ? `Der Vorschlag von ${topVotedName} erhielt die stärkste Unterstützung.`
        : 'Es wurde keine klare Gewinneridee identifiziert.'),
      220
    ),
    voteResult: clipText(voteResult, 220),
    finalStatements,
    voteExplanations
  } satisfies CouncilVerdict
}
