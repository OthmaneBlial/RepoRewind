export function sampleEvenly<T>(items: readonly T[], maximum: number): T[] {
  if (!Number.isSafeInteger(maximum) || maximum <= 0) return []
  if (items.length <= maximum) return [...items]
  if (maximum === 1) return [items.at(-1)!]

  const selected: T[] = []
  for (let slot = 0; slot < maximum; slot += 1) {
    const index = Math.round((slot * (items.length - 1)) / (maximum - 1))
    selected.push(items[index])
  }
  return selected
}
