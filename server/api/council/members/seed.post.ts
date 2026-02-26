import { db, schema } from "~~/server/db";

const sampleMembers = [
  {
    name: "Astra Vale",
    title: "Strategist",
    personality:
      "Analytical and structured. Speaks in clear frameworks, surfaces tradeoffs, and pushes for measurable decisions.",
    objective: "Turn broad ideas into practical plans with explicit priorities.",
    accentColor: "#3B82F6",
  },
  {
    name: "Milo Crest",
    title: "Product Advocate",
    personality:
      "User-focused and direct. Brings real-world scenarios, highlights friction, and keeps the discussion grounded in outcomes.",
    objective: "Protect user value and keep solutions simple to adopt.",
    accentColor: "#10B981",
  },
  {
    name: "Nora Quinn",
    title: "Risk Officer",
    personality:
      "Calm and skeptical. Identifies operational, legal, and reliability risks without blocking progress unnecessarily.",
    objective: "Reduce downside while preserving forward momentum.",
    accentColor: "#F97316",
  },
  {
    name: "Jules Orion",
    title: "Creative Lead",
    personality:
      "Imaginative and energetic. Suggests unconventional options, reframes stale debates, and broadens possibility space.",
    objective: "Introduce novel approaches that still map to business goals.",
    accentColor: "#EC4899",
  },
  {
    name: "Ivy Rowan",
    title: "Systems Architect",
    personality:
      "Technical and pragmatic. Explains complexity plainly, stresses maintainability, and spots scaling issues early.",
    objective: "Ensure proposals can be implemented reliably over time.",
    accentColor: "#8B5CF6",
  },
  {
    name: "Theo Park",
    title: "Operations Captain",
    personality:
      "Execution-first and disciplined. Focuses on sequencing, ownership, and realistic delivery constraints.",
    objective: "Convert decisions into coordinated, trackable execution.",
    accentColor: "#06B6D4",
  },
];

export default defineEventHandler(async () => {
  const existingMembers = await db.query.councilMembers.findMany({
    columns: {
      name: true,
    },
  });

  const existingNames = new Set(
    existingMembers.map((member) => member.name.trim().toLowerCase()),
  );

  const membersToCreate = sampleMembers.filter(
    (member) => !existingNames.has(member.name.trim().toLowerCase()),
  );

  if (membersToCreate.length === 0) {
    return {
      created: 0,
      members: [],
    };
  }

  const createdMembers = await db
    .insert(schema.councilMembers)
    .values(membersToCreate)
    .returning();

  return {
    created: createdMembers.length,
    members: createdMembers,
  };
});
