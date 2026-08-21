import { describe, expect, it, vi } from 'vitest'
import { sampleHistory } from '../data/sample-history'
import { MAX_HISTORY_FILE_BYTES, prepareHistoryFile } from './prepare-history'

describe('history file preparation', () => {
  it('prepares a valid archive without a worker', async () => {
    vi.stubGlobal('Worker', undefined)
    const progress: number[] = []
    const file = new File([JSON.stringify(sampleHistory)], 'history.json', { type: 'application/json' })

    const prepared = await prepareHistoryFile(file, (value) => progress.push(value))

    expect(prepared.history.repository.name).toBe('repo-rewind')
    expect(prepared.index.commitCount).toBe(sampleHistory.commits.length)
    expect(progress.at(-1)).toBe(1)
    vi.unstubAllGlobals()
  })

  it('rejects oversized and canceled imports before allocating archive state', async () => {
    const oversized = new File(['{}'], 'oversized.json')
    Object.defineProperty(oversized, 'size', { value: MAX_HISTORY_FILE_BYTES + 1 })
    await expect(prepareHistoryFile(oversized, () => undefined)).rejects.toThrow('limited')

    const controller = new AbortController()
    controller.abort()
    const valid = new File([JSON.stringify(sampleHistory)], 'history.json')
    await expect(prepareHistoryFile(valid, () => undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })
})
