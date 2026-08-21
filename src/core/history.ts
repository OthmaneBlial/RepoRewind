import type {
  Commit,
  FileSnapshot,
  HistoryIndex,
  HistorySnapshot,
  RepositoryHistory,
  TravelerSnapshot,
} from './types'

const languageByExtension: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  rs: 'Rust', go: 'Go', py: 'Python', rb: 'Ruby', java: 'Java', kt: 'Kotlin',
  swift: 'Swift', c: 'C', h: 'C', cpp: 'C++', cc: 'C++', cs: 'C#',
  php: 'PHP', css: 'CSS', scss: 'CSS', html: 'HTML', vue: 'Vue', svelte: 'Svelte',
  md: 'Docs', mdx: 'Docs', json: 'Data', yaml: 'Data', yml: 'Data', toml: 'Data',
  sql: 'SQL', sh: 'Shell', zsh: 'Shell', dockerfile: 'Docker',
}

export function languageForPath(path: string): string {
  const name = path.split('/').pop()?.toLowerCase() ?? ''
  if (name === 'dockerfile') return 'Docker'
  const extension = name.includes('.') ? name.split('.').pop() ?? '' : name
  return languageByExtension[extension] ?? 'Other'
}

export function districtForPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.length > 1 ? segments[0] : 'root'
}

export function isRefactorCommit(commit: Commit): boolean {
  const messageSignal = /\b(refactor|restructure|reorganize|rewrite|cleanup|clean up|extract|move)\b/i.test(commit.message)
  const renameSignal = commit.files.some((file) => file.status === 'renamed')
  const broadRewrite = commit.files.length >= 8 && commit.additions > 0 && commit.deletions > 0
  return messageSignal || renameSignal || broadRewrite
}

interface ReplayState {
  files: Map<string, FileSnapshot>
  travelers: Map<string, TravelerSnapshot>
}

function emptyReplayState(): ReplayState {
  return { files: new Map(), travelers: new Map() }
}

function applyCommit(state: ReplayState, commit: Commit, index: number): void {
  const fileState = state.files
  commit.files.forEach((change) => {
    if (change.status === 'renamed' && change.previousPath) {
      const previous = fileState.get(change.previousPath)
      if (previous) {
        fileState.delete(change.previousPath)
        fileState.set(change.path, {
          ...previous,
          path: change.path,
          district: districtForPath(change.path),
          language: languageForPath(change.path),
          alive: true,
          deletedAt: undefined,
          additions: previous.additions + change.additions,
          deletions: previous.deletions + change.deletions,
          lines: Math.max(1, previous.lines + change.additions - change.deletions),
          lastAuthorId: commit.authorId,
          lastCommitHash: commit.hash,
        })
        return
      }
    }

    const previous = fileState.get(change.path)
    if (change.status === 'deleted') {
      fileState.set(change.path, {
        ...(previous ?? {
          path: change.path,
          district: districtForPath(change.path),
          language: languageForPath(change.path),
          lines: Math.max(1, change.deletions),
          additions: 0,
          deletions: 0,
          age: index,
        }),
        alive: false,
        deletedAt: commit.authoredAt,
        deletions: (previous?.deletions ?? 0) + change.deletions,
        lastAuthorId: commit.authorId,
        lastCommitHash: commit.hash,
      })
      return
    }

    fileState.set(change.path, {
      path: change.path,
      district: districtForPath(change.path),
      language: languageForPath(change.path),
      lines: Math.max(1, (previous?.lines ?? 0) + change.additions - change.deletions),
      additions: (previous?.additions ?? 0) + change.additions,
      deletions: (previous?.deletions ?? 0) + change.deletions,
      alive: true,
      deletedAt: undefined,
      lastAuthorId: commit.authorId,
      lastCommitHash: commit.hash,
      age: previous?.age ?? index,
    })
  })

  const touchedPath = commit.files.find((file) => file.status !== 'deleted')?.path
    ?? commit.files[0]?.path
  if (touchedPath) {
    state.travelers.set(commit.authorId, {
      authorId: commit.authorId,
      path: touchedPath,
      activity: commit.files.length,
    })
  }
}

function copyCheckpointState(index: number, state: ReplayState) {
  return {
    index,
    files: Array.from(state.files.values(), (file) => ({ ...file })),
    travelers: Array.from(state.travelers.values(), (traveler) => ({ ...traveler })),
  }
}

function restoreCheckpointState(checkpoint: HistoryIndex['checkpoints'][number]): ReplayState {
  return {
    files: new Map(checkpoint.files.map((file) => [file.path, { ...file }])),
    travelers: new Map(checkpoint.travelers.map((traveler) => [traveler.authorId, { ...traveler }])),
  }
}

export function buildHistoryIndex(
  history: RepositoryHistory,
  onProgress?: (progress: number) => void,
): HistoryIndex {
  const state = emptyReplayState()
  const checkpointInterval = Math.max(32, Math.ceil(history.commits.length / 64))
  const checkpoints: HistoryIndex['checkpoints'] = []
  const mergeIndices: number[] = []
  const refactorIndices: number[] = []
  const releaseHashSet = new Set(history.releases.map((release) => release.commitHash))
  const releaseIndices: number[] = []
  const paths = new Set<string>()
  const fileActivity = new Map<string, HistoryIndex['fileActivity'][number]>()
  const contributorActivity = new Map<string, HistoryIndex['contributorActivity'][number]>()
  const contributorNames = new Map(history.contributors.map((contributor) => [contributor.id, contributor.name]))
  const commitSearch: string[] = []
  const progressStep = Math.max(1, Math.floor(history.commits.length / 100))

  onProgress?.(0)
  history.commits.forEach((commit, index) => {
    const contributor = contributorActivity.get(commit.authorId)
    contributorActivity.set(commit.authorId, {
      authorId: commit.authorId,
      firstIndex: contributor?.firstIndex ?? index,
      lastIndex: index,
      commits: (contributor?.commits ?? 0) + 1,
    })
    commitSearch.push(`${commit.hash} ${commit.message} ${contributorNames.get(commit.authorId) ?? ''}`.toLocaleLowerCase())
    commit.files.forEach((file) => {
      paths.add(file.path)
      if (file.previousPath) paths.add(file.previousPath)
      const activity = fileActivity.get(file.path)
      fileActivity.set(file.path, {
        path: file.path,
        firstIndex: activity?.firstIndex ?? index,
        lastIndex: index,
        touches: (activity?.touches ?? 0) + 1,
      })
      if (file.previousPath) {
        const previousActivity = fileActivity.get(file.previousPath)
        fileActivity.set(file.previousPath, {
          path: file.previousPath,
          firstIndex: previousActivity?.firstIndex ?? Math.max(0, index - 1),
          lastIndex: Math.max(previousActivity?.lastIndex ?? 0, index - 1),
          touches: (previousActivity?.touches ?? 0) + 1,
        })
      }
    })
    applyCommit(state, commit, index)
    if (commit.parents.length > 1) mergeIndices.push(index)
    if (isRefactorCommit(commit)) refactorIndices.push(index)
    if (releaseHashSet.has(commit.hash)) releaseIndices.push(index)
    if (index === 0 || index % checkpointInterval === 0 || index === history.commits.length - 1) {
      checkpoints.push(copyCheckpointState(index, state))
    }
    if (index % progressStep === 0 || index === history.commits.length - 1) {
      onProgress?.((index + 1) / history.commits.length)
    }
  })

  return {
    version: 1,
    commitCount: history.commits.length,
    checkpointInterval,
    checkpoints,
    mergeIndices,
    refactorIndices,
    releaseIndices,
    paths: Array.from(paths),
    fileActivity: Array.from(fileActivity.values()),
    contributorActivity: Array.from(contributorActivity.values()),
    commitSearch,
  }
}

export class HistoryEngine {
  readonly length: number
  private readonly releasesByCommit: Map<string, RepositoryHistory['releases'][number]>
  private readonly cache = new Map<number, HistorySnapshot>()

  constructor(
    private readonly history: RepositoryHistory,
    private readonly index: HistoryIndex = buildHistoryIndex(history),
  ) {
    if (index.version !== 1 || index.commitCount !== history.commits.length || index.checkpoints.length === 0) {
      throw new Error('History index does not match this repository export.')
    }
    this.length = history.commits.length
    this.releasesByCommit = new Map(history.releases.map((release) => [release.commitHash, release]))
  }

  snapshotAt(requestedIndex: number): HistorySnapshot {
    const index = Math.max(0, Math.min(this.length - 1, Math.floor(requestedIndex)))
    const cached = this.cache.get(index)
    if (cached) {
      this.cache.delete(index)
      this.cache.set(index, cached)
      return cached
    }

    let checkpoint = this.index.checkpoints[0]
    for (const candidate of this.index.checkpoints) {
      if (candidate.index > index) break
      checkpoint = candidate
    }
    const state = restoreCheckpointState(checkpoint)
    for (let commitIndex = checkpoint.index + 1; commitIndex <= index; commitIndex += 1) {
      applyCommit(state, this.history.commits[commitIndex], commitIndex)
    }

    const commit = this.history.commits[index]
    const files = Array.from(state.files.values(), (file) => ({ ...file }))
    const aliveFiles = files.filter((file) => file.alive)
    const release = this.releasesByCommit.get(commit.hash)
    const snapshot: HistorySnapshot = {
      index,
      date: commit.authoredAt,
      commit,
      files,
      travelers: Array.from(state.travelers.values(), (traveler) => ({ ...traveler })),
      activeFiles: aliveFiles.length,
      totalLines: aliveFiles.reduce((total, file) => total + file.lines, 0),
      additions: commit.additions,
      deletions: commit.deletions,
      isRelease: Boolean(release),
      release,
      isRefactor: isRefactorCommit(commit),
      isMerge: commit.parents.length > 1,
      isMainline: commit.isMainline !== false,
      refs: commit.refs ?? [],
    }

    this.cache.set(index, snapshot)
    if (this.cache.size > 24) this.cache.delete(this.cache.keys().next().value as number)
    return snapshot
  }

  getIndex(): HistoryIndex {
    return this.index
  }
}

export function buildSnapshots(history: RepositoryHistory): HistorySnapshot[] {
  const engine = new HistoryEngine(history)
  return history.commits.map((_, index) => engine.snapshotAt(index))
}

export function validateHistory(input: unknown): RepositoryHistory {
  if (!input || typeof input !== 'object') throw new Error('History file is not an object.')
  const history = input as Partial<RepositoryHistory>
  if (history.schemaVersion !== 1) throw new Error('Unsupported RepoRewind schema version.')
  if (!history.repository?.name) throw new Error('History file has no repository name.')
  if (!Array.isArray(history.commits) || history.commits.length === 0) {
    throw new Error('History file contains no commits.')
  }
  if (!Array.isArray(history.contributors) || !Array.isArray(history.releases)) {
    throw new Error('History file is missing contributors or releases.')
  }
  const allowedStatuses = new Set(['added', 'modified', 'deleted', 'renamed'])
  history.commits.forEach((commit, commitIndex) => {
    if (!commit || typeof commit.hash !== 'string' || !commit.hash) {
      throw new Error(`Commit ${commitIndex + 1} has no hash.`)
    }
    if (!Array.isArray(commit.parents) || typeof commit.authorId !== 'string' || !Array.isArray(commit.files)) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has an invalid structure.`)
    }
    if (typeof commit.message !== 'string' || !Number.isFinite(commit.additions) || !Number.isFinite(commit.deletions)) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has invalid metadata.`)
    }
    if (typeof commit.authoredAt !== 'string' || Number.isNaN(new Date(commit.authoredAt).getTime())) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has an invalid date.`)
    }
    commit.files.forEach((file, fileIndex) => {
      if (!file || typeof file.path !== 'string' || !file.path || !allowedStatuses.has(file.status)) {
        throw new Error(`File change ${fileIndex + 1} in commit ${commit.hash.slice(0, 7)} is invalid.`)
      }
      if (!Number.isFinite(file.additions) || !Number.isFinite(file.deletions)) {
        throw new Error(`File change ${file.path} has invalid line counts.`)
      }
    })
  })
  return {
    ...(history as RepositoryHistory),
    repository: {
      ...history.repository,
      scope: history.repository.scope ?? 'branch',
    },
    branches: Array.isArray(history.branches) ? history.branches : [],
  }
}
