import type { Commit, FileSnapshot, HistoryIndex, HistorySnapshot, RepositoryHistory, TravelerSnapshot } from './types'

const languageByExtension: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  rs: 'Rust',
  go: 'Go',
  py: 'Python',
  rb: 'Ruby',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  c: 'C',
  h: 'C',
  cpp: 'C++',
  cc: 'C++',
  cs: 'C#',
  php: 'PHP',
  css: 'CSS',
  scss: 'CSS',
  html: 'HTML',
  vue: 'Vue',
  svelte: 'Svelte',
  md: 'Docs',
  mdx: 'Docs',
  json: 'Data',
  yaml: 'Data',
  yml: 'Data',
  toml: 'Data',
  sql: 'SQL',
  sh: 'Shell',
  zsh: 'Shell',
  dockerfile: 'Docker',
}

export function languageForPath(path: string): string {
  const name = path.split('/').pop()?.toLowerCase() ?? ''
  if (name === 'dockerfile') return 'Docker'
  const extension = name.includes('.') ? (name.split('.').pop() ?? '') : name
  return languageByExtension[extension] ?? 'Other'
}

export function districtForPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.length > 1 ? segments[0] : 'root'
}

export function isRefactorCommit(commit: Commit): boolean {
  const messageSignal = /\b(refactor|restructure|reorganize|rewrite|cleanup|clean up|extract|move)\b/i.test(
    commit.message,
  )
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

  const touchedPath = commit.files.find((file) => file.status !== 'deleted')?.path ?? commit.files[0]?.path
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

export function buildHistoryIndex(history: RepositoryHistory, onProgress?: (progress: number) => void): HistoryIndex {
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
  const commitIndexByHash = new Map<string, number>()
  const progressStep = Math.max(1, Math.floor(history.commits.length / 100))

  onProgress?.(0)
  history.commits.forEach((commit, index) => {
    commitIndexByHash.set(commit.hash, index)
    const contributor = contributorActivity.get(commit.authorId)
    contributorActivity.set(commit.authorId, {
      authorId: commit.authorId,
      firstIndex: contributor?.firstIndex ?? index,
      lastIndex: index,
      commits: (contributor?.commits ?? 0) + 1,
    })
    commitSearch.push(
      `${commit.hash} ${commit.message} ${contributorNames.get(commit.authorId) ?? ''}`.toLocaleLowerCase(),
    )
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
    commitIndexByHash,
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
    if (
      index.version !== 1 ||
      index.commitCount !== history.commits.length ||
      index.checkpoints.length === 0 ||
      index.commitIndexByHash.size !== history.commits.length
    ) {
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

const MAX_COMMITS = 250_000
const MAX_TOTAL_FILE_CHANGES = 2_000_000
const MAX_CONTRIBUTORS = 100_000
const MAX_LANDMARKS = 100_000
const MAX_PATH_LENGTH = 4_096
const MAX_MESSAGE_LENGTH = 32_768

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function assertOnlyKeys(record: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const allowedKeys = new Set(allowed)
  const unsupported = Object.keys(record).find((key) => !allowedKeys.has(key))
  if (unsupported) throw new Error(`${label} contains an unsupported field: ${unsupported}.`)
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(new Date(value).getTime())
}

function validateString(value: unknown, label: string, maximum = MAX_MESSAGE_LENGTH): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new Error(`${label} must be a non-empty string no longer than ${maximum.toLocaleString()} characters.`)
  }
}

export function validateHistory(input: unknown): RepositoryHistory {
  if (!isRecord(input)) throw new Error('History file is not an object.')
  assertOnlyKeys(
    input,
    ['schemaVersion', 'repository', 'contributors', 'commits', 'releases', 'branches'],
    'History file',
  )
  const history = input as Partial<RepositoryHistory>
  if (history.schemaVersion !== 1) throw new Error('Unsupported RepoRewind schema version.')
  if (!isRecord(history.repository)) throw new Error('History file has no repository metadata.')
  assertOnlyKeys(
    history.repository,
    ['name', 'branch', 'scope', 'truncated', 'remote', 'generatedAt', 'firstCommitAt', 'lastCommitAt'],
    'Repository metadata',
  )
  validateString(history.repository.name, 'Repository name', 256)
  validateString(history.repository.branch, 'Repository branch', 1_024)
  if (
    history.repository.scope !== undefined &&
    history.repository.scope !== 'branch' &&
    history.repository.scope !== 'all-branches'
  ) {
    throw new Error('Repository scope is invalid.')
  }
  if (history.repository.truncated !== undefined && typeof history.repository.truncated !== 'boolean') {
    throw new Error('Repository truncation metadata is invalid.')
  }
  if (
    history.repository.remote !== undefined &&
    (typeof history.repository.remote !== 'string' ||
      history.repository.remote.length > MAX_PATH_LENGTH ||
      Array.from(history.repository.remote).some((character) => {
        const code = character.codePointAt(0) ?? 0
        return code < 32 || code === 127
      }))
  ) {
    throw new Error('Repository remote is invalid.')
  }
  if (
    !isValidDate(history.repository.generatedAt) ||
    !isValidDate(history.repository.firstCommitAt) ||
    !isValidDate(history.repository.lastCommitAt)
  ) {
    throw new Error('Repository metadata contains an invalid date.')
  }
  if (!Array.isArray(history.commits) || history.commits.length === 0) {
    throw new Error('History file contains no commits.')
  }
  if (history.commits.length > MAX_COMMITS) {
    throw new Error(
      `History file exceeds the ${MAX_COMMITS.toLocaleString()} commit safety limit. Re-run the analyzer with --max-commits.`,
    )
  }
  if (!Array.isArray(history.contributors) || !Array.isArray(history.releases)) {
    throw new Error('History file is missing contributors or releases.')
  }
  if (history.contributors.length > MAX_CONTRIBUTORS) throw new Error('History file contains too many contributors.')
  if (history.releases.length > MAX_LANDMARKS) throw new Error('History file contains too many releases.')
  if (history.branches !== undefined && (!Array.isArray(history.branches) || history.branches.length > MAX_LANDMARKS)) {
    throw new Error('History file contains an invalid branch list.')
  }

  const contributorIds = new Set<string>()
  history.contributors.forEach((contributor, contributorIndex) => {
    if (!isRecord(contributor)) throw new Error(`Contributor ${contributorIndex + 1} has an invalid structure.`)
    assertOnlyKeys(
      contributor,
      ['id', 'name', 'email', 'color', 'commits', 'additions', 'deletions'],
      `Contributor ${contributorIndex + 1}`,
    )
    validateString(contributor.id, `Contributor ${contributorIndex + 1} id`, 512)
    validateString(contributor.name, `Contributor ${contributorIndex + 1} name`, 1_024)
    if (contributorIds.has(contributor.id)) throw new Error(`Contributor id ${contributor.id} is duplicated.`)
    contributorIds.add(contributor.id)
    if (!/^#[0-9a-f]{6}$/i.test(contributor.color))
      throw new Error(`Contributor ${contributor.id} has an invalid color.`)
    if (![contributor.commits, contributor.additions, contributor.deletions].every(isNonNegativeInteger)) {
      throw new Error(`Contributor ${contributor.id} has invalid statistics.`)
    }
    if (contributor.email !== undefined && (typeof contributor.email !== 'string' || contributor.email.length > 320)) {
      throw new Error(`Contributor ${contributor.id} has an invalid email field.`)
    }
  })

  const allowedStatuses = new Set(['added', 'modified', 'deleted', 'renamed'])
  const commitHashes = new Set<string>()
  let totalFileChanges = 0
  history.commits.forEach((commit, commitIndex) => {
    if (!isRecord(commit) || typeof commit.hash !== 'string' || !commit.hash || commit.hash.length > 256) {
      throw new Error(`Commit ${commitIndex + 1} has no hash.`)
    }
    assertOnlyKeys(
      commit,
      [
        'hash',
        'parents',
        'refs',
        'isMainline',
        'isBaseline',
        'authorId',
        'authoredAt',
        'message',
        'additions',
        'deletions',
        'files',
      ],
      `Commit ${commit.hash.slice(0, 7)}`,
    )
    if (commitHashes.has(commit.hash)) throw new Error(`Commit ${commit.hash.slice(0, 12)} is duplicated.`)
    commitHashes.add(commit.hash)
    if (!Array.isArray(commit.parents) || typeof commit.authorId !== 'string' || !Array.isArray(commit.files)) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has an invalid structure.`)
    }
    if (!contributorIds.has(commit.authorId))
      throw new Error(`Commit ${commit.hash.slice(0, 7)} references an unknown contributor.`)
    if (commit.parents.some((parent) => typeof parent !== 'string' || !parent || parent.length > 256)) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has invalid parent hashes.`)
    }
    if (
      commit.refs !== undefined &&
      (!Array.isArray(commit.refs) || commit.refs.some((ref) => typeof ref !== 'string' || ref.length > 1_024))
    ) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has invalid refs.`)
    }
    if (
      (commit.isMainline !== undefined && typeof commit.isMainline !== 'boolean') ||
      (commit.isBaseline !== undefined && typeof commit.isBaseline !== 'boolean')
    ) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has invalid flags.`)
    }
    if (
      typeof commit.message !== 'string' ||
      commit.message.length > MAX_MESSAGE_LENGTH ||
      !isNonNegativeInteger(commit.additions) ||
      !isNonNegativeInteger(commit.deletions)
    ) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has invalid metadata.`)
    }
    if (!isValidDate(commit.authoredAt)) {
      throw new Error(`Commit ${commit.hash.slice(0, 7)} has an invalid date.`)
    }
    totalFileChanges += commit.files.length
    if (totalFileChanges > MAX_TOTAL_FILE_CHANGES) {
      throw new Error(
        `History file exceeds the ${MAX_TOTAL_FILE_CHANGES.toLocaleString()} file-change safety limit. Re-run the analyzer with --max-commits.`,
      )
    }
    commit.files.forEach((file, fileIndex) => {
      if (
        !isRecord(file) ||
        typeof file.path !== 'string' ||
        !file.path ||
        file.path.length > MAX_PATH_LENGTH ||
        !allowedStatuses.has(file.status)
      ) {
        throw new Error(`File change ${fileIndex + 1} in commit ${commit.hash.slice(0, 7)} is invalid.`)
      }
      assertOnlyKeys(
        file,
        ['path', 'previousPath', 'status', 'additions', 'deletions', 'binary'],
        `File change ${file.path}`,
      )
      if (!isNonNegativeInteger(file.additions) || !isNonNegativeInteger(file.deletions)) {
        throw new Error(`File change ${file.path} has invalid line counts.`)
      }
      if (
        (file.previousPath !== undefined &&
          (typeof file.previousPath !== 'string' ||
            !file.previousPath ||
            file.previousPath.length > MAX_PATH_LENGTH)) ||
        (file.binary !== undefined && typeof file.binary !== 'boolean')
      ) {
        throw new Error(`File change ${file.path} has invalid optional metadata.`)
      }
      if (
        file.status === 'renamed' &&
        (typeof file.previousPath !== 'string' || !file.previousPath || file.previousPath.length > MAX_PATH_LENGTH)
      ) {
        throw new Error(`Renamed file ${file.path} has no valid previous path.`)
      }
    })
  })

  if (
    history.repository.firstCommitAt !== history.commits[0].authoredAt ||
    history.repository.lastCommitAt !== history.commits.at(-1)!.authoredAt
  ) {
    throw new Error('Repository date bounds do not match the retained commit history.')
  }

  const releaseTags = new Set<string>()
  history.releases.forEach((release, releaseIndex) => {
    if (!isRecord(release)) throw new Error(`Release ${releaseIndex + 1} has an invalid structure.`)
    assertOnlyKeys(release, ['tag', 'commitHash', 'date', 'message'], `Release ${releaseIndex + 1}`)
    validateString(release.tag, `Release ${releaseIndex + 1} tag`, 1_024)
    validateString(release.commitHash, `Release ${releaseIndex + 1} commit hash`, 256)
    if (releaseTags.has(release.tag)) throw new Error(`Release tag ${release.tag} is duplicated.`)
    releaseTags.add(release.tag)
    if (!commitHashes.has(release.commitHash)) throw new Error(`Release ${release.tag} references an unknown commit.`)
    if (!isValidDate(release.date)) throw new Error(`Release ${release.tag} has an invalid date.`)
    if (
      release.message !== undefined &&
      (typeof release.message !== 'string' || release.message.length > MAX_MESSAGE_LENGTH)
    ) {
      throw new Error(`Release ${release.tag} has an invalid message.`)
    }
  })

  const branchNames = new Set<string>()
  history.branches?.forEach((branch, branchIndex) => {
    if (!isRecord(branch)) throw new Error(`Branch ${branchIndex + 1} has an invalid structure.`)
    assertOnlyKeys(branch, ['name', 'tipHash', 'color', 'isCurrent', 'isRemote'], `Branch ${branchIndex + 1}`)
    validateString(branch.name, `Branch ${branchIndex + 1} name`, 1_024)
    validateString(branch.tipHash, `Branch ${branchIndex + 1} tip`, 256)
    if (branchNames.has(branch.name)) throw new Error(`Branch name ${branch.name} is duplicated.`)
    branchNames.add(branch.name)
    if (
      !/^#[0-9a-f]{6}$/i.test(branch.color) ||
      typeof branch.isCurrent !== 'boolean' ||
      typeof branch.isRemote !== 'boolean'
    ) {
      throw new Error(`Branch ${branch.name} has invalid metadata.`)
    }
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

export function parseHistoryJson(text: string): RepositoryHistory {
  try {
    return validateHistory(JSON.parse(text))
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('This file is not valid JSON.')
    throw error
  }
}
