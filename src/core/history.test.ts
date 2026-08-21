import { describe, expect, it } from 'vitest'
import {
  buildHistoryIndex,
  buildSnapshots,
  districtForPath,
  HistoryEngine,
  isRefactorCommit,
  languageForPath,
  parseHistoryJson,
  validateHistory,
} from './history'
import type { RepositoryHistory } from './types'
import { sampleHistory } from '../data/sample-history'

describe('history engine', () => {
  it('replays the complete sample without mutating prior snapshots', () => {
    const snapshots = buildSnapshots(sampleHistory)
    expect(snapshots).toHaveLength(sampleHistory.commits.length)
    expect(snapshots[0].activeFiles).toBe(3)
    expect(snapshots.at(-1)?.activeFiles).toBeGreaterThan(snapshots[0].activeFiles)
    expect(snapshots[0].files.find((file) => file.path === 'src/index.ts')?.lines).toBe(96)
  })

  it('keeps deleted files as ruins and moves renamed buildings', () => {
    const snapshots = buildSnapshots(sampleHistory)
    const refactorFrame = snapshots.find(
      (snapshot) => snapshot.commit.message === 'Refactor renderer into a scene graph',
    )
    expect(refactorFrame?.files.find((file) => file.path === 'src/renderer/materials.ts')?.alive).toBe(false)
    expect(refactorFrame?.files.find((file) => file.path === 'src/scene/city.ts')?.alive).toBe(true)
    expect(refactorFrame?.files.find((file) => file.path === 'src/renderer/city.ts')).toBeUndefined()
  })

  it('recognizes languages, districts, releases, and rebuild events', () => {
    expect(languageForPath('apps/studio/App.tsx')).toBe('TypeScript')
    expect(languageForPath('Dockerfile')).toBe('Docker')
    expect(districtForPath('apps/studio/App.tsx')).toBe('apps')
    expect(districtForPath('README.md')).toBe('root')
    expect(isRefactorCommit(sampleHistory.commits[7])).toBe(true)
    const snapshots = buildSnapshots(sampleHistory)
    expect(snapshots.filter((snapshot) => snapshot.isRelease)).toHaveLength(sampleHistory.releases.length)
  })

  it('rejects malformed imports with actionable errors', () => {
    expect(() => validateHistory({ schemaVersion: 2 })).toThrow('Unsupported')
    expect(() =>
      validateHistory({
        schemaVersion: 1,
        repository: {
          name: 'empty',
          branch: 'main',
          generatedAt: '2026-01-01T00:00:00Z',
          firstCommitAt: '2026-01-01T00:00:00Z',
          lastCommitAt: '2026-01-01T00:00:00Z',
        },
        contributors: [],
        commits: [],
        releases: [],
      }),
    ).toThrow('no commits')
    expect(() => parseHistoryJson('{broken')).toThrow('not valid JSON')

    const invalidCounts = structuredClone(sampleHistory)
    invalidCounts.commits[0].files[0].additions = -1
    expect(() => validateHistory(invalidCounts)).toThrow('invalid line counts')

    const duplicateCommit = structuredClone(sampleHistory)
    duplicateCommit.commits[1].hash = duplicateCommit.commits[0].hash
    expect(() => validateHistory(duplicateCommit)).toThrow('duplicated')
  })

  it('indexes long histories with bounded checkpoints and deterministic random access', () => {
    const commits = Array.from({ length: 5_000 }, (_, index) => ({
      hash: `commit-${index}`,
      parents: index === 0 ? [] : [`commit-${index - 1}`],
      authorId: 'archive-builder',
      authoredAt: new Date(Date.UTC(2000, 0, 1 + index)).toISOString(),
      message: `Change ${index}`,
      additions: 1,
      deletions: 0,
      files: [{ path: `src/file-${index % 120}.ts`, status: 'modified' as const, additions: 1, deletions: 0 }],
    }))
    const history: RepositoryHistory = {
      schemaVersion: 1,
      repository: {
        name: 'long-history',
        branch: 'main',
        scope: 'branch',
        generatedAt: new Date().toISOString(),
        firstCommitAt: commits[0].authoredAt,
        lastCommitAt: commits.at(-1)!.authoredAt,
      },
      contributors: [
        {
          id: 'archive-builder',
          name: 'Archive Builder',
          color: '#ffb45c',
          commits: commits.length,
          additions: commits.length,
          deletions: 0,
        },
      ],
      commits,
      releases: [],
      branches: [],
    }
    const progress: number[] = []
    const index = buildHistoryIndex(history, (value) => progress.push(value))
    const engine = new HistoryEngine(history, index)

    expect(index.checkpoints.length).toBeLessThanOrEqual(66)
    expect(progress.at(-1)).toBe(1)
    expect(engine.snapshotAt(4_999)).toMatchObject({ activeFiles: 120, totalLines: 5_000 })
    expect(engine.snapshotAt(999).totalLines).toBe(1_000)
    expect(engine.snapshotAt(4_999).totalLines).toBe(5_000)
  })
})
