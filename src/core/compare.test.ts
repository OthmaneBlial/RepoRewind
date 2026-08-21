import { describe, expect, it } from 'vitest'
import { compareHistoryFrames } from './compare'
import { HistoryEngine } from './history'
import { sampleHistory } from '../data/sample-history'

describe('historical comparisons', () => {
  const engine = new HistoryEngine(sampleHistory)

  it('distinguishes construction, demolition, rebuilding, and renames', () => {
    const comparison = compareHistoryFrames(sampleHistory, engine, 6, 8)
    expect(comparison.commits).toBe(2)
    expect(comparison.counts.renamed).toBe(2)
    expect(comparison.counts.deleted).toBe(1)
    expect(comparison.files).toContainEqual(
      expect.objectContaining({
        kind: 'renamed',
        previousPath: 'src/renderer/city.ts',
        path: 'src/scene/city.ts',
      }),
    )
    expect(comparison.linesDelta).toBe(comparison.after.totalLines - comparison.before.totalLines)
  })

  it('normalizes reverse selections and treats identical frames as unchanged', () => {
    expect(compareHistoryFrames(sampleHistory, engine, 8, 6)).toMatchObject({ fromIndex: 6, toIndex: 8 })
    const same = compareHistoryFrames(sampleHistory, engine, 5, 5)
    expect(same.files).toEqual([])
    expect(same.commits).toBe(0)
  })
})
