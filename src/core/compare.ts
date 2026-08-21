import { districtForPath } from './history'
import type { HistoryEngine } from './history'
import type { HistorySnapshot, RepositoryHistory } from './types'

export type ComparisonKind = 'added' | 'deleted' | 'modified' | 'renamed'

export interface ComparedFile {
  path: string
  previousPath?: string
  district: string
  kind: ComparisonKind
  beforeLines: number
  afterLines: number
  delta: number
}

export interface HistoryComparison {
  fromIndex: number
  toIndex: number
  before: HistorySnapshot
  after: HistorySnapshot
  commits: number
  contributors: number
  additions: number
  deletions: number
  filesDelta: number
  linesDelta: number
  files: ComparedFile[]
  counts: Record<ComparisonKind, number>
}

export function compareHistoryFrames(
  history: RepositoryHistory,
  engine: HistoryEngine,
  firstIndex: number,
  secondIndex: number,
): HistoryComparison {
  const fromIndex = Math.min(firstIndex, secondIndex)
  const toIndex = Math.max(firstIndex, secondIndex)
  const before = engine.snapshotAt(fromIndex)
  const after = engine.snapshotAt(toIndex)
  const beforeFiles = new Map(before.files.filter((file) => file.alive).map((file) => [file.path, file]))
  const afterFiles = new Map(after.files.filter((file) => file.alive).map((file) => [file.path, file]))
  const currentPathByOrigin = new Map(Array.from(beforeFiles.keys(), (path) => [path, path]))
  const touchedPaths = new Set<string>()
  const commits = history.commits.slice(fromIndex + 1, toIndex + 1)

  commits.forEach((commit) =>
    commit.files.forEach((change) => {
      touchedPaths.add(change.path)
      if (change.previousPath) touchedPaths.add(change.previousPath)
      if (change.status === 'renamed' && change.previousPath) {
        const origin = Array.from(currentPathByOrigin.entries()).find(
          ([, current]) => current === change.previousPath,
        )?.[0]
        if (origin) currentPathByOrigin.set(origin, change.path)
      }
    }),
  )

  const matchedBefore = new Set<string>()
  const matchedAfter = new Set<string>()
  const files: ComparedFile[] = []

  beforeFiles.forEach((beforeFile, originPath) => {
    const currentPath = currentPathByOrigin.get(originPath) ?? originPath
    const afterFile = afterFiles.get(currentPath)
    if (!afterFile) return
    matchedBefore.add(originPath)
    matchedAfter.add(currentPath)
    if (currentPath !== originPath) {
      files.push({
        path: currentPath,
        previousPath: originPath,
        district: districtForPath(currentPath),
        kind: 'renamed',
        beforeLines: beforeFile.lines,
        afterLines: afterFile.lines,
        delta: afterFile.lines - beforeFile.lines,
      })
    } else if (beforeFile.lines !== afterFile.lines || touchedPaths.has(currentPath)) {
      files.push({
        path: currentPath,
        district: afterFile.district,
        kind: 'modified',
        beforeLines: beforeFile.lines,
        afterLines: afterFile.lines,
        delta: afterFile.lines - beforeFile.lines,
      })
    }
  })

  beforeFiles.forEach((file, path) => {
    if (matchedBefore.has(path)) return
    const lastKnownPath = currentPathByOrigin.get(path) ?? path
    files.push({
      path: lastKnownPath,
      previousPath: lastKnownPath !== path ? path : undefined,
      district: districtForPath(lastKnownPath),
      kind: 'deleted',
      beforeLines: file.lines,
      afterLines: 0,
      delta: -file.lines,
    })
  })
  afterFiles.forEach((file, path) => {
    if (matchedAfter.has(path)) return
    files.push({
      path,
      district: file.district,
      kind: 'added',
      beforeLines: 0,
      afterLines: file.lines,
      delta: file.lines,
    })
  })

  const counts: HistoryComparison['counts'] = { added: 0, deleted: 0, modified: 0, renamed: 0 }
  files.forEach((file) => {
    counts[file.kind] += 1
  })
  files.sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta) || left.path.localeCompare(right.path))
  const contributorIds = new Set(commits.map((commit) => commit.authorId))

  return {
    fromIndex,
    toIndex,
    before,
    after,
    commits: commits.length,
    contributors: contributorIds.size,
    additions: commits.reduce((total, commit) => total + commit.additions, 0),
    deletions: commits.reduce((total, commit) => total + commit.deletions, 0),
    filesDelta: after.activeFiles - before.activeFiles,
    linesDelta: after.totalLines - before.totalLines,
    files,
    counts,
  }
}
