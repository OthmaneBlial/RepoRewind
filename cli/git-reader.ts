import { basename, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import type {
  BranchRef,
  ChangeStatus,
  Commit,
  Contributor,
  FileChange,
  Release,
  RepositoryHistory,
} from '../src/core/types'

const RECORD_SEPARATOR = '\u001e'
const FIELD_SEPARATOR = '\u001f'
const contributorColors = ['#ffb45c', '#63d8bd', '#ed6f5d', '#82aaff', '#db91ff', '#d7e36f', '#ff8fb4', '#70c7ff']
const branchColors = ['#63d8bd', '#ffb45c', '#82aaff', '#db91ff', '#ed6f5d', '#d7e36f']

function runGit(repositoryPath: string, args: string[]): string {
  const result = spawnSync('git', ['-C', repositoryPath, ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  })
  if (result.status !== 0) {
    const reason = result.stderr.trim() || `git exited with status ${result.status}`
    throw new Error(reason)
  }
  return result.stdout
}

async function streamGitRecords(
  repositoryPath: string,
  args: string[],
  onRecord: (record: string) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('git', ['-C', repositoryPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    const stdoutDecoder = new TextDecoder()
    const stderrDecoder = new TextDecoder()
    let buffered = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Uint8Array) => {
      const parts = `${buffered}${stdoutDecoder.decode(chunk, { stream: true })}`.split(RECORD_SEPARATOR)
      buffered = parts.pop() ?? ''
      parts.map((record) => record.trim()).filter(Boolean).forEach(onRecord)
    })
    child.stderr.on('data', (chunk: Uint8Array) => { stderr += stderrDecoder.decode(chunk, { stream: true }) })
    child.on('error', reject)
    child.on('close', (status) => {
      buffered += stdoutDecoder.decode()
      stderr += stderrDecoder.decode()
      if (buffered.trim()) onRecord(buffered.trim())
      if (status === 0) resolve()
      else reject(new Error(stderr.trim() || `git exited with status ${status}`))
    })
  })
}

function stableId(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `author-${(hash >>> 0).toString(36)}`
}

interface StatusEntry {
  path: string
  previousPath?: string
  status: ChangeStatus
}

function parseRecords(output: string): string[] {
  return output.split(RECORD_SEPARATOR).map((record) => record.trim()).filter(Boolean)
}

export function parseNameStatus(output: string): Map<string, StatusEntry[]> {
  const result = new Map<string, StatusEntry[]>()
  parseRecords(output).forEach((record) => {
    const [header = '', ...lines] = record.split('\n')
    const hash = header.trim()
    const entries: StatusEntry[] = []
    lines.map((line) => line.trim()).filter(Boolean).forEach((line) => {
      const [code = 'M', firstPath = '', secondPath] = line.split('\t')
      const kind = code[0]
      if (kind === 'R' || kind === 'C') {
        entries.push({ path: secondPath || firstPath, previousPath: firstPath, status: 'renamed' })
      } else {
        const status: ChangeStatus = kind === 'A' ? 'added' : kind === 'D' ? 'deleted' : 'modified'
        entries.push({ path: firstPath, status })
      }
    })
    result.set(hash, entries)
  })
  return result
}

function expandRenamePath(value: string): { path: string; previousPath?: string } {
  const braced = value.match(/^(.*)\{(.*) => (.*)\}(.*)$/)
  if (braced) {
    return {
      previousPath: `${braced[1]}${braced[2]}${braced[4]}`,
      path: `${braced[1]}${braced[3]}${braced[4]}`,
    }
  }
  const direct = value.match(/^(.*) => (.*)$/)
  if (direct) return { previousPath: direct[1], path: direct[2] }
  return { path: value }
}

interface NumstatEntry {
  path: string
  previousPath?: string
  additions: number
  deletions: number
  binary: boolean
}

export function parseNumstat(output: string): Array<{
  header: string[]
  stats: NumstatEntry[]
}> {
  return parseRecords(output).map((record) => {
    const [headerLine = '', ...lines] = record.split('\n')
    const stats = lines.map((line) => line.trim()).filter(Boolean).flatMap((line) => {
      const [added = '0', deleted = '0', rawPath = ''] = line.split('\t')
      if (!rawPath) return []
      const binary = added === '-' || deleted === '-'
      return [{
        ...expandRenamePath(rawPath),
        additions: binary ? 0 : Number.parseInt(added, 10) || 0,
        deletions: binary ? 0 : Number.parseInt(deleted, 10) || 0,
        binary,
      }]
    })
    return { header: headerLine.split(FIELD_SEPARATOR), stats }
  })
}

function mergeChanges(stats: NumstatEntry[], statuses: StatusEntry[]): FileChange[] {
  const unusedStats = [...stats]
  const changes: FileChange[] = statuses.map((status) => {
    const statIndex = unusedStats.findIndex((stat) =>
      stat.path === status.path
      || (status.previousPath && stat.previousPath === status.previousPath)
      || (status.previousPath && stat.path === status.previousPath),
    )
    const stat = statIndex >= 0 ? unusedStats.splice(statIndex, 1)[0] : undefined
    return {
      ...status,
      additions: stat?.additions ?? 0,
      deletions: stat?.deletions ?? 0,
      binary: stat?.binary || undefined,
    }
  })
  unusedStats.forEach((stat) => changes.push({ ...stat, status: 'modified', binary: stat.binary || undefined }))
  return changes
}

function readReleases(repositoryPath: string): Release[] {
  const output = runGit(repositoryPath, [
    'for-each-ref',
    '--sort=creatordate',
    '--format=%(refname:short)%09%(creatordate:iso-strict)%09%(subject)',
    'refs/tags',
  ])
  return output.split('\n').filter(Boolean).flatMap((line) => {
    const [tag, date, message] = line.split('\t')
    if (!tag || !date) return []
    const commitHash = runGit(repositoryPath, ['rev-list', '-n', '1', tag]).trim()
    return [{ tag, date, message: message || undefined, commitHash }]
  })
}

function readBranches(repositoryPath: string, currentBranch: string): BranchRef[] {
  const output = runGit(repositoryPath, [
    'for-each-ref',
    '--format=%(refname)%09%(objectname)',
    'refs/heads',
    'refs/remotes',
  ])
  return output.split('\n').filter(Boolean).flatMap((line) => {
    const [refname, tipHash] = line.split('\t')
    if (!refname || !tipHash || refname.endsWith('/HEAD')) return []
    const isRemote = refname.startsWith('refs/remotes/')
    const name = refname.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\//, '')
    let colorSeed = 0
    for (let index = 0; index < name.length; index += 1) colorSeed += name.charCodeAt(index)
    return [{
      name,
      tipHash,
      color: branchColors[colorSeed % branchColors.length],
      isCurrent: name === currentBranch,
      isRemote,
    }]
  })
}

export interface AnalyzeOptions {
  maxCommits?: number
  includeEmails?: boolean
  branch?: string
}

interface AnalysisContext {
  repositoryPath: string
  selectedBranch: string
  historyWalkArgs: string[]
}

function createAnalysisContext(inputPath: string, options: AnalyzeOptions): AnalysisContext {
  const repositoryPath = resolve(inputPath)
  runGit(repositoryPath, ['rev-parse', '--is-inside-work-tree'])
  const checkedOutBranch = runGit(repositoryPath, ['branch', '--show-current']).trim() || 'HEAD'
  const selectedBranch = options.branch || checkedOutBranch
  runGit(repositoryPath, ['rev-parse', '--verify', `${selectedBranch}^{commit}`])
  const maxArgs = options.maxCommits ? [`--max-count=${options.maxCommits}`] : []
  const historyWalkArgs = ['--first-parent', '--reverse', '--topo-order', '--diff-merges=first-parent', ...maxArgs]
  return { repositoryPath, selectedBranch, historyWalkArgs }
}

function numstatArgs(context: AnalysisContext): string[] {
  return [
    'log', ...context.historyWalkArgs, '--date=iso-strict', '--find-renames',
    `--pretty=format:${RECORD_SEPARATOR}%H${FIELD_SEPARATOR}%P${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%ae${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%s`,
    '--numstat', context.selectedBranch,
  ]
}

function nameStatusArgs(context: AnalysisContext): string[] {
  return [
    'log', ...context.historyWalkArgs, '--find-renames',
    `--pretty=format:${RECORD_SEPARATOR}%H`, '--name-status', context.selectedBranch,
  ]
}

function assembleHistory(
  context: AnalysisContext,
  options: AnalyzeOptions,
  parsedRecords: ReturnType<typeof parseNumstat>,
  statuses: Map<string, StatusEntry[]>,
): RepositoryHistory {
  const { repositoryPath, selectedBranch } = context
  const includedHashes = new Set(parsedRecords.map((record) => record.header[0]))
  const firstRecord = parsedRecords[0]
  const firstParents = firstRecord?.header[1]?.split(' ').filter(Boolean) ?? []
  const needsBaseline = Boolean(firstRecord && firstParents.some((parent) => !includedHashes.has(parent)))
  if (needsBaseline) {
    const firstHash = firstRecord.header[0]
    const emptyTree = runGit(repositoryPath, ['hash-object', '-t', 'tree', '/dev/null']).trim()
    const baselineNumstat = runGit(repositoryPath, ['diff', '--numstat', '--no-renames', emptyTree, firstHash, '--'])
    const baselineStatus = runGit(repositoryPath, ['diff', '--name-status', '--no-renames', emptyTree, firstHash, '--'])
    firstRecord.stats = parseNumstat(`${RECORD_SEPARATOR}${firstHash}\n${baselineNumstat}`)[0]?.stats ?? []
    statuses.set(firstHash, parseNameStatus(`${RECORD_SEPARATOR}${firstHash}\n${baselineStatus}`).get(firstHash) ?? [])
  }
  const contributors = new Map<string, Contributor>()
  const branches = readBranches(repositoryPath, selectedBranch)
  const refsByCommit = new Map<string, string[]>()
  branches.forEach((branch) => {
    const refs = refsByCommit.get(branch.tipHash) ?? []
    refs.push(branch.name)
    refsByCommit.set(branch.tipHash, refs)
  })

  const commits: Commit[] = parsedRecords.map(({ header, stats }, commitIndex) => {
    const [hash = '', parents = '', authorName = 'Unknown', authorEmail = '', authoredAt = '', message = 'Untitled commit'] = header
    const authorId = stableId(authorEmail.toLowerCase() || authorName.toLowerCase())
    const files = mergeChanges(stats, statuses.get(hash) ?? [])
    const additions = files.reduce((total, file) => total + file.additions, 0)
    const deletions = files.reduce((total, file) => total + file.deletions, 0)
    const existing = contributors.get(authorId)
    contributors.set(authorId, {
      id: authorId,
      name: authorName,
      email: options.includeEmails ? authorEmail : undefined,
      color: existing?.color ?? contributorColors[contributors.size % contributorColors.length],
      commits: (existing?.commits ?? 0) + 1,
      additions: (existing?.additions ?? 0) + additions,
      deletions: (existing?.deletions ?? 0) + deletions,
    })
    return {
      hash,
      parents: parents ? parents.split(' ') : [],
      refs: refsByCommit.get(hash),
      isMainline: true,
      isBaseline: needsBaseline && commitIndex === 0,
      authorId,
      authoredAt,
      message,
      additions,
      deletions,
      files,
    }
  })

  if (commits.length === 0) throw new Error('The repository has no reachable commits.')
  const remoteResult = spawnSync('git', ['-C', repositoryPath, 'remote', 'get-url', 'origin'], { encoding: 'utf8' })
  const remote = remoteResult.status === 0 ? remoteResult.stdout.trim() : undefined
  const commitHashes = new Set(commits.map((commit) => commit.hash))
  const releases = readReleases(repositoryPath).filter((release) => commitHashes.has(release.commitHash))

  return {
    schemaVersion: 1,
    repository: {
      name: basename(repositoryPath),
      branch: selectedBranch,
      scope: 'branch',
      truncated: needsBaseline,
      remote: remote || undefined,
      generatedAt: new Date().toISOString(),
      firstCommitAt: commits[0].authoredAt,
      lastCommitAt: commits[commits.length - 1].authoredAt,
    },
    contributors: Array.from(contributors.values()).sort((a, b) => b.commits - a.commits),
    commits,
    releases,
    branches,
  }
}

export function analyzeRepository(inputPath: string, options: AnalyzeOptions = {}): RepositoryHistory {
  const context = createAnalysisContext(inputPath, options)
  const statuses = parseNameStatus(runGit(context.repositoryPath, nameStatusArgs(context)))
  const parsedRecords = parseNumstat(runGit(context.repositoryPath, numstatArgs(context)))
  return assembleHistory(context, options, parsedRecords, statuses)
}

export async function analyzeRepositoryStreaming(
  inputPath: string,
  options: AnalyzeOptions = {},
): Promise<RepositoryHistory> {
  const context = createAnalysisContext(inputPath, options)
  const statuses = new Map<string, StatusEntry[]>()
  const parsedRecords: ReturnType<typeof parseNumstat> = []
  await Promise.all([
    streamGitRecords(context.repositoryPath, nameStatusArgs(context), (record) => {
      parseNameStatus(`${RECORD_SEPARATOR}${record}`).forEach((entries, hash) => statuses.set(hash, entries))
    }),
    streamGitRecords(context.repositoryPath, numstatArgs(context), (record) => {
      const parsed = parseNumstat(`${RECORD_SEPARATOR}${record}`)[0]
      if (parsed) parsedRecords.push(parsed)
    }),
  ])
  return assembleHistory(context, options, parsedRecords, statuses)
}
