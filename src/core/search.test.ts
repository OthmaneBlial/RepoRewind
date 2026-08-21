import { describe, expect, it } from 'vitest'
import { buildHistoryIndex } from './history'
import { searchArchive } from './search'
import { sampleHistory } from '../data/sample-history'

describe('archive search', () => {
  const index = buildHistoryIndex(sampleHistory)

  it('finds files and navigates renamed paths to their last visible frame', () => {
    const [currentFile] = searchArchive(sampleHistory, index, 'compositor')
    expect(currentFile).toMatchObject({ kind: 'file', path: 'src/export/compositor.ts' })

    const [historicFile] = searchArchive(sampleHistory, index, 'file:src/renderer/city.ts')
    expect(historicFile).toMatchObject({ kind: 'file', path: 'src/renderer/city.ts', index: 6 })
  })

  it('searches commits, contributors, releases, and branch tips with filters', () => {
    expect(searchArchive(sampleHistory, index, 'author:maya')[0]).toMatchObject({
      kind: 'contributor',
      title: 'Maya Chen',
    })
    expect(searchArchive(sampleHistory, index, 'release:v2')[0]).toMatchObject({ kind: 'release', title: 'v2.0.0' })
    expect(searchArchive(sampleHistory, index, 'branch:main')[0]).toMatchObject({ kind: 'branch', title: 'main' })
    expect(searchArchive(sampleHistory, index, 'commit:travelers arrive')[0]).toMatchObject({
      kind: 'commit',
      title: 'Travelers arrive',
    })
  })

  it('returns no broad suggestions for an empty query', () => {
    expect(searchArchive(sampleHistory, index, '   ')).toEqual([])
  })
})
