export type ChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed'

export interface FileChange {
  path: string
  previousPath?: string
  status: ChangeStatus
  additions: number
  deletions: number
  binary?: boolean
}

export interface Commit {
  hash: string
  parents: string[]
  refs?: string[]
  isMainline?: boolean
  isBaseline?: boolean
  authorId: string
  authoredAt: string
  message: string
  additions: number
  deletions: number
  files: FileChange[]
}

export interface Contributor {
  id: string
  name: string
  email?: string
  color: string
  commits: number
  additions: number
  deletions: number
}

export interface Release {
  tag: string
  commitHash: string
  date: string
  message?: string
}

export interface BranchRef {
  name: string
  tipHash: string
  color: string
  isCurrent: boolean
  isRemote: boolean
}

export interface RepositoryMeta {
  name: string
  branch: string
  scope?: 'branch' | 'all-branches'
  truncated?: boolean
  remote?: string
  generatedAt: string
  firstCommitAt: string
  lastCommitAt: string
}

export interface RepositoryHistory {
  schemaVersion: 1
  repository: RepositoryMeta
  contributors: Contributor[]
  commits: Commit[]
  releases: Release[]
  branches?: BranchRef[]
}

export interface FileSnapshot {
  path: string
  district: string
  language: string
  lines: number
  additions: number
  deletions: number
  alive: boolean
  deletedAt?: string
  lastAuthorId: string
  lastCommitHash: string
  age: number
}

export interface TravelerSnapshot {
  authorId: string
  path: string
  activity: number
}

export interface HistorySnapshot {
  index: number
  date: string
  commit: Commit
  files: FileSnapshot[]
  travelers: TravelerSnapshot[]
  activeFiles: number
  totalLines: number
  additions: number
  deletions: number
  isRelease: boolean
  release?: Release
  isRefactor: boolean
  isMerge: boolean
  isMainline: boolean
  refs: string[]
}

export interface HistoryCheckpoint {
  index: number
  files: FileSnapshot[]
  travelers: TravelerSnapshot[]
}

export interface HistoryIndex {
  version: 1
  commitCount: number
  checkpointInterval: number
  checkpoints: HistoryCheckpoint[]
  mergeIndices: number[]
  refactorIndices: number[]
  releaseIndices: number[]
  paths: string[]
  fileActivity: Array<{
    path: string
    firstIndex: number
    lastIndex: number
    touches: number
  }>
  contributorActivity: Array<{
    authorId: string
    firstIndex: number
    lastIndex: number
    commits: number
  }>
  commitSearch: string[]
}
