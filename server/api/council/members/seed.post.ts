import { db, schema } from "~~/server/db";

const sampleMembers = [
  {
    name: "Astra Vale",
    title: "Strategin",
    personality:
      "Analytisch und strukturiert. Spricht in klaren Konzepten, zeigt Abwägungen auf und strebt nach messbaren Entscheidungen.",
    objective: "Breite Ideen in praktische Pläne mit klaren Prioritäten umwandeln.",
    accentColor: "#3B82F6",
  },
  {
    name: "Milo Crest",
    title: "Produktanwalt",
    personality:
      "Nutzerorientiert und direkt. Bringt reale Szenarien ein, beleuchtet Reibungspunkte und hält die Diskussion auf Ergebnisse ausgerichtet.",
    objective: "Nutzerwert schützen und Lösungen einfach umsetzbar halten.",
    accentColor: "#10B981",
  },
  {
    name: "Nora Quinn",
    title: "Risikomanagerin",
    personality:
      "Ruhig und skeptisch. Identifiziert operative, rechtliche und technische Risiken, ohne den Fortschritt unnötig zu bremsen.",
    objective: "Risiken reduzieren und dabei den Vorwärtsdrang erhalten.",
    accentColor: "#F97316",
  },
  {
    name: "Jules Orion",
    title: "Kreativleiterin",
    personality:
      "Einfallsreich und energiegeladen. Schlägt unkonventionelle Optionen vor, bringt festgefahrene Debatten in Bewegung und erweitert den Möglichkeitsraum.",
    objective: "Neue Ansätze einbringen, die dennoch auf Geschäftsziele einzahlen.",
    accentColor: "#EC4899",
  },
  {
    name: "Ivy Rowan",
    title: "Systemarchitektin",
    personality:
      "Technisch und pragmatisch. Erklärt Komplexität verständlich, betont Wartbarkeit und erkennt Skalierungsprobleme frühzeitig.",
    objective: "Sicherstellen, dass Vorschläge langfristig zuverlässig umsetzbar sind.",
    accentColor: "#8B5CF6",
  },
  {
    name: "Theo Park",
    title: "Operationsleiter",
    personality:
      "Ausführungsorientiert und diszipliniert. Fokussiert auf Reihenfolge, Zuständigkeiten und realistische Lieferfristen.",
    objective: "Entscheidungen in koordinierte, nachverfolgbare Umsetzung überführen.",
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
