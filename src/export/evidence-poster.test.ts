import { describe, expect, it } from 'vitest'
import { buildHistoryIndex, HistoryEngine } from '../core/history'
import { shareSettingsForPreset } from '../core/privacy'
import { sampleHistory } from '../data/sample-history'
import { buildEvidencePosterModel } from './evidence-poster'

describe('non-WebGL evidence poster', () => {
  it('builds a useful public projection without leaking identifying archive strings', () => {
    const index = buildHistoryIndex(sampleHistory)
    const snapshot = new HistoryEngine(sampleHistory, index).snapshotAt(sampleHistory.commits.length - 1)
    const model = buildEvidencePosterModel(sampleHistory, index, snapshot, shareSettingsForPreset('public'))
    const serialized = JSON.stringify(model)

    expect(model.repository).toBe('Repository history')
    expect(model.stats).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Commits', value: '25' })]))
    expect(model.activity.length).toBeGreaterThan(1)
    expect(model.chapters.length).toBeGreaterThan(1)
    expect(serialized).not.toContain(sampleHistory.repository.name)
    expect(serialized).not.toContain(sampleHistory.contributors[0].name)
    expect(serialized).not.toContain(sampleHistory.commits[0].message)
    expect(serialized).not.toContain(sampleHistory.commits[0].files[0].path)
  })
})
