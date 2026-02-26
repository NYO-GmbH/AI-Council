export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

export function clipText(text: string, max = 320) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) {
    return normalized
  }
  return `${normalized.slice(0, max - 3)}...`
}
