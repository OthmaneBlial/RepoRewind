import type { HistoryIndex, RepositoryHistory } from './types'

export type ArchiveSearchKind = 'file' | 'commit' | 'contributor' | 'release' | 'branch'

export interface ArchiveSearchResult {
  id: string
  kind: ArchiveSearchKind
  title: string
  subtitle: string
  index: number
  score: number
  path?: string
  authorId?: string
}

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
}

function scoreText(title: string, searchText: string, queryTokens: string[]): number {
  const normalizedTitle = normalize(title)
  const normalizedText = normalize(searchText)
  let score = 0
  for (const token of queryTokens) {
    const titlePosition = normalizedTitle.indexOf(token)
    const textPosition = normalizedText.indexOf(token)
    if (titlePosition < 0 && textPosition < 0) return 0
    if (normalizedTitle === token) score += 240
    else if (titlePosition === 0) score += 150
    else if (titlePosition > 0) score += 105 - Math.min(60, titlePosition)
    else score += 55 - Math.min(35, textPosition)
  }
  return score
}

const kindPrefixes: Record<string, ArchiveSearchKind> = {
  file: 'file', path: 'file', commit: 'commit', author: 'contributor',
  traveler: 'contributor', release: 'release', tag: 'release', branch: 'branch',
}

export function searchArchive(
  history: RepositoryHistory,
  index: HistoryIndex,
  rawQuery: string,
  limit = 14,
): ArchiveSearchResult[] {
  let query = rawQuery.trim()
  let kindFilter: ArchiveSearchKind | undefined
  const prefix = query.match(/^([a-z]+):\s*/i)
  if (prefix && kindPrefixes[prefix[1].toLocaleLowerCase()]) {
    kindFilter = kindPrefixes[prefix[1].toLocaleLowerCase()]
    query = query.slice(prefix[0].length)
  }
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  const results: ArchiveSearchResult[] = []
  const include = (kind: ArchiveSearchKind) => !kindFilter || kindFilter === kind

  if (include('file')) {
    index.fileActivity.forEach((file) => {
      const name = file.path.split('/').pop() ?? file.path
      const score = scoreText(name, file.path, tokens)
      if (score > 0) results.push({
        id: `file:${file.path}`,
        kind: 'file',
        title: file.path,
        subtitle: `${file.touches.toLocaleString()} change${file.touches === 1 ? '' : 's'} · last seen ${new Date(history.commits[file.lastIndex].authoredAt).getUTCFullYear()}`,
        index: file.lastIndex,
        path: file.path,
        score: score + Math.min(25, file.touches),
      })
    })
  }

  if (include('commit')) {
    history.commits.forEach((commit, commitIndex) => {
      const score = scoreText(commit.message, index.commitSearch[commitIndex] ?? `${commit.hash} ${commit.message}`, tokens)
      if (score > 0) results.push({
        id: `commit:${commit.hash}`,
        kind: 'commit',
        title: commit.message || 'Untitled commit',
        subtitle: `${commit.hash.slice(0, 7)} · ${new Date(commit.authoredAt).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`,
        index: commitIndex,
        path: commit.files.find((file) => file.status !== 'deleted')?.path ?? commit.files[0]?.path,
        score: score + (commitIndex / history.commits.length) * 8,
      })
    })
  }

  if (include('contributor')) {
    const activityByAuthor = new Map(index.contributorActivity.map((activity) => [activity.authorId, activity]))
    history.contributors.forEach((contributor) => {
      const activity = activityByAuthor.get(contributor.id)
      if (!activity) return
      const score = scoreText(contributor.name, `${contributor.name} ${contributor.email ?? ''}`, tokens)
      if (score > 0) results.push({
        id: `contributor:${contributor.id}`,
        kind: 'contributor',
        title: contributor.name,
        subtitle: `${activity.commits.toLocaleString()} commit${activity.commits === 1 ? '' : 's'} · traveler`,
        index: activity.lastIndex,
        authorId: contributor.id,
        score: score + Math.min(30, activity.commits / 3),
      })
    })
  }

  if (include('release')) {
    history.releases.forEach((release) => {
      const commitIndex = history.commits.findIndex((commit) => commit.hash === release.commitHash)
      if (commitIndex < 0) return
      const score = scoreText(release.tag, `${release.tag} ${release.message ?? ''}`, tokens)
      if (score > 0) results.push({
        id: `release:${release.tag}`,
        kind: 'release',
        title: release.tag,
        subtitle: `${release.message ?? 'Historical release'} · ${new Date(release.date).getUTCFullYear()}`,
        index: commitIndex,
        score: score + 25,
      })
    })
  }

  if (include('branch')) {
    ;(history.branches ?? []).forEach((branch) => {
      const commitIndex = history.commits.findIndex((commit) => commit.hash === branch.tipHash)
      if (commitIndex < 0) return
      const score = scoreText(branch.name, branch.name, tokens)
      if (score > 0) results.push({
        id: `branch:${branch.name}`,
        kind: 'branch',
        title: branch.name,
        subtitle: `${branch.isRemote ? 'Remote' : 'Local'} branch tip`,
        index: commitIndex,
        score: score + 20,
      })
    })
  }

  return results.sort((left, right) => right.score - left.score || right.index - left.index).slice(0, limit)
}
