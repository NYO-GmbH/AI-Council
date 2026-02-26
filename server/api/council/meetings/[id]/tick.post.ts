import { generateText } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "~~/server/db";
import { z } from "zod";
import { defaultModel } from "../../../../utils/lmstudio";

const bodySchema = z.object({
  userMessage: z.string().min(1).max(400).optional(),
});

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function clipText(text: string, max = 320) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 3)}...`;
}

async function generateVerdict(topic: string, transcript: string) {
  const { text } = await generateText({
    model: defaultModel,
    system: `You are a neutral council moderator.
Create a concise final summary and a vote result.
Return plain text in this exact format:
SUMMARY: <1-2 sentences>
WINNING_IDEA: <single sentence>
VOTE_RESULT: <example "Astra 3, Forge 2, Lumen 1">`,
    prompt: `Meeting topic: ${topic}\n\nTranscript:\n${transcript || "No transcript."}`,
  });

  const lines = text.split("\n").map((line) => line.trim());
  const summary =
    lines
      .find((line) => line.startsWith("SUMMARY:"))
      ?.replace("SUMMARY:", "")
      .trim() || "The council discussion is complete.";
  const winningIdea =
    lines
      .find((line) => line.startsWith("WINNING_IDEA:"))
      ?.replace("WINNING_IDEA:", "")
      .trim() || "No clear winning idea was identified.";
  const voteResult =
    lines
      .find((line) => line.startsWith("VOTE_RESULT:"))
      ?.replace("VOTE_RESULT:", "")
      .trim() || "No vote result available.";

  return {
    summary: clipText(summary, 420),
    winningIdea: clipText(winningIdea, 220),
    voteResult: clipText(voteResult, 220),
  };
}

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);
  const { userMessage } = await readValidatedBody(event, bodySchema.parse);

  const meeting = await db.query.councilMeetings.findFirst({
    where: () => and(eq(schema.councilMeetings.id, id as string)),
    with: {
      messages: {
        orderBy: () => asc(schema.councilMessages.createdAt),
        with: {
          member: true,
        },
      },
    },
  });

  if (!meeting) {
    throw createError({
      statusCode: 404,
      statusMessage: "Council meeting not found.",
    });
  }

  if (meeting.status === "completed") {
    return {
      status: "completed",
      message: null,
      verdict: meeting.state?.verdict || null,
    };
  }

  if (meeting.status === "paused") {
    return {
      status: "paused",
      message: null,
    };
  }

  const allMembers = await db.query.councilMembers.findMany();
  const activeMembers = allMembers.filter((member) => member.isActive);

  if (activeMembers.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No active council members available.",
    });
  }

  const transcriptMessages = [...meeting.messages];

  if (userMessage?.trim()) {
    await db.insert(schema.councilMessages).values({
      meetingId: meeting.id,
      role: "user",
      content: userMessage.trim(),
    });
    transcriptMessages.push({
      id: crypto.randomUUID(),
      meetingId: meeting.id,
      memberId: null,
      role: "user",
      content: userMessage.trim(),
      createdAt: new Date(),
      member: null,
    } as (typeof meeting.messages)[number]);
  }

  const currentState = meeting.state || {
    queue: [],
    rounds: 0,
    maxRounds: 2,
    concluded: false,
  };
  const maxRounds = Math.max(1, currentState.maxRounds || 2);
  let queue = (currentState.queue || []).filter((memberId) =>
    activeMembers.some((member) => member.id === memberId),
  );
  let rounds = currentState.rounds || 0;

  if (queue.length === 0) {
    if (rounds < maxRounds) {
      queue = shuffle(activeMembers.map((member) => member.id));
      rounds += 1;
    } else {
      if (!currentState.concluded) {
        const fullTranscript = transcriptMessages
          .map((message) => {
            const author =
              message.role === "agent"
                ? message.member?.name || "Agent"
                : message.role === "user"
                  ? "User"
                  : "System";
            return `${author}: ${message.content}`;
          })
          .join("\n");

        const verdict = await generateVerdict(meeting.topic, fullTranscript);
        const verdictText = `Council conclusion: ${verdict.summary}\nWinning idea: ${verdict.winningIdea}\nVote: ${verdict.voteResult}`;

        await db.insert(schema.councilMessages).values({
          meetingId: meeting.id,
          role: "system",
          content: verdictText,
        });

        await db
          .update(schema.councilMeetings)
          .set({
            status: "completed",
            state: {
              queue: [],
              rounds,
              maxRounds,
              concluded: true,
              verdict,
            },
          })
          .where(eq(schema.councilMeetings.id, meeting.id));

        return {
          status: "completed",
          message: null,
          verdict,
        };
      }

      return {
        status: "completed",
        message: null,
        verdict: currentState.verdict || null,
      };
    }
  }

  const speakerId = queue.shift();
  const speaker = activeMembers.find((member) => member.id === speakerId);
  if (!speaker) {
    return { status: "idle", message: null };
  }

  const transcript = transcriptMessages
    .slice(-14)
    .map((message) => {
      const author =
        message.role === "agent"
          ? message.member?.name || "Agent"
          : message.role === "user"
            ? "User"
            : "System";
      return `${author}: ${message.content}`;
    })
    .join("\n");

  const { text } = await generateText({
    model: defaultModel,
    system: `You are ${speaker.name}, ${speaker.title}, in an AI council.
Personality: ${speaker.personality}
Objective: ${speaker.objective}

Rules:
- Keep your response to 1-2 sentences.
- Be concrete and collaborative.
- If relevant, react to the latest speaker.
- Do not use markdown headings or bullet points.`,
    prompt: `Recent transcript:\n${transcript || "No messages yet."}\n\nMeeting topic: ${meeting.topic}\nContribute one concise turn that advances the conversation.`,
  });

  const content = clipText(text);

  const [message] = await db
    .insert(schema.councilMessages)
    .values({
      meetingId: meeting.id,
      memberId: speaker.id,
      role: "agent",
      content,
    })
    .returning();

  await db
    .update(schema.councilMeetings)
    .set({
      status: "active",
      lastSpokeAt: new Date(),
      state: {
        queue,
        rounds,
        maxRounds,
        concluded: false,
        verdict: undefined,
      },
    })
    .where(eq(schema.councilMeetings.id, meeting.id));

  return {
    status: "spoke",
    message: {
      ...message,
      member: speaker,
    },
  };
});
