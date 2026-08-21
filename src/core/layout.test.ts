import { describe, expect, it } from 'vitest'
import { buildSnapshots } from './history'
import { buildCityLayout } from './layout'
import { sampleHistory } from '../data/sample-history'

describe('city layout', () => {
  it('is deterministic and preserves sites for demolished buildings', () => {
    const snapshots = buildSnapshots(sampleHistory)
    const first = buildCityLayout(sampleHistory, { finalFiles: snapshots.at(-1)?.files ?? [] })
    const second = buildCityLayout(sampleHistory, { finalFiles: snapshots.at(-1)?.files ?? [] })
    expect(first.buildings.get('src/index.ts')).toEqual(second.buildings.get('src/index.ts'))
    expect(first.buildings.has('src/renderer/materials.ts')).toBe(true)
    expect(first.districts.map((district) => district.name)).toContain('src')
  })
})
