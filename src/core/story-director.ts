import { isRefactorCommit } from './history'
import type { Commit, RepositoryHistory } from './types'

export type StoryChapterKind = 'origins' | 'growth' | 'rebuild' | 'release-range' | 'ownership' | 'ruins' | 'last-year'

export interface StoryEvidence {
  label: string
  index: number
  commitHash: string
  path?: string
}

export interface StoryChapter {
  id: string
  kind: StoryChapterKind
  title: string
  summary: string
  reason: string
  score: number
  startIndex: number
  endIndex: number
  evidence: StoryEvidence[]
}

export interface StoryChapterSelection {
  id: string
  kind: StoryChapterKind
  title: string
  startIndex: number
  endIndex: number
}

export interface StoryPlan {
  version: 1
  chapters: StoryChapter[]
  warnings: string[]
}

interface RankedRange {
  startIndex: number
  endIndex: number
  score: number
}

function chooseRange(candidates: RankedRange[]): RankedRange {
  return [...candidates].sort(
    (left, right) => right.score - left.score || left.startIndex - right.startIndex || left.endIndex - right.endIndex,
  )[0]
}

function evidence(commit: Commit, index: number, label: string, path?: string): StoryEvidence {
  return { label, index, commitHash: commit.hash, ...(path ? { path } : {}) }
}

function districtForPath(path: string): string {
  return path.split('/').filter(Boolean)[0] ?? 'root'
}

function originsChapter(
  history: RepositoryHistory,
  releaseIndices: Array<{ index: number; tag: string }>,
): StoryChapter {
  const endIndex =
    releaseIndices[0]?.index ??
    Math.min(history.commits.length - 1, Math.max(0, Math.ceil(history.commits.length * 0.2) - 1))
  const endCommit = history.commits[endIndex]
  const release = releaseIndices[0]
  return {
    id: `origins-0-${endIndex}`,
    kind: 'origins',
    title: 'Origins',
    summary: release ? `From the first commit through ${release.tag}.` : 'The opening foundation of the repository.',
    reason: release
      ? `${endIndex + 1} commits lead to the first recorded stable release, ${release.tag}.`
      : `No release tags exist, so the opening ${endIndex + 1} commits define the bounded origin chapter.`,
    score: endIndex + 1,
    startIndex: 0,
    endIndex,
    evidence: [
      evidence(history.commits[0], 0, 'First commit'),
      ...(endIndex > 0
        ? [evidence(endCommit, endIndex, release ? `First release: ${release.tag}` : 'End of origins')]
        : []),
    ],
  }
}

function growthChapter(history: RepositoryHistory): StoryChapter {
  const windowSize = Math.min(8, Math.max(2, Math.ceil(history.commits.length / 5)))
  const candidates: RankedRange[] = []
  for (let startIndex = 0; startIndex <= Math.max(0, history.commits.length - windowSize); startIndex += 1) {
    const endIndex = Math.min(history.commits.length - 1, startIndex + windowSize - 1)
    const commits = history.commits.slice(startIndex, endIndex + 1)
    const lineGrowth = commits.reduce((total, commit) => total + Math.max(0, commit.additions - commit.deletions), 0)
    const createdFiles = commits.reduce(
      (total, commit) => total + commit.files.filter((file) => file.status === 'added').length,
      0,
    )
    candidates.push({ startIndex, endIndex, score: lineGrowth + createdFiles * 40 })
  }
  const selected = chooseRange(candidates)
  const peakIndex = history.commits
    .map((commit, index) => ({ commit, index }))
    .slice(selected.startIndex, selected.endIndex + 1)
    .sort((left, right) => right.commit.additions - left.commit.additions || left.index - right.index)[0].index
  const windowCommits = history.commits.slice(selected.startIndex, selected.endIndex + 1)
  const createdFiles = windowCommits.reduce(
    (total, commit) => total + commit.files.filter((file) => file.status === 'added').length,
    0,
  )
  const netLines = windowCommits.reduce((total, commit) => total + commit.additions - commit.deletions, 0)
  return {
    id: `growth-${selected.startIndex}-${selected.endIndex}`,
    kind: 'growth',
    title: 'Growth spurt',
    summary: `${createdFiles} files created and ${netLines >= 0 ? '+' : ''}${netLines.toLocaleString()} net lines in the strongest bounded window.`,
    reason: `Every ${windowSize}-commit window is scored as positive line growth plus 40 points per created file; the earliest exact tie wins.`,
    score: selected.score,
    startIndex: selected.startIndex,
    endIndex: selected.endIndex,
    evidence: [evidence(history.commits[peakIndex], peakIndex, 'Largest addition event in the selected window')],
  }
}

function rebuildChapter(history: RepositoryHistory): StoryChapter | undefined {
  const candidates = history.commits
    .map((commit, index) => {
      const renames = commit.files.filter((file) => file.status === 'renamed').length
      const deletions = commit.files.filter((file) => file.status === 'deleted').length
      const modifications = commit.files.filter((file) => file.status === 'modified').length
      const merge = commit.parents.length > 1
      const candidate = renames > 0 || merge || isRefactorCommit(commit)
      return {
        index,
        score: candidate ? renames * 100 + deletions * 25 + modifications * 5 + (merge ? 30 : 0) : 0,
        renames,
        deletions,
        merge,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
  const selected = candidates[0]
  if (!selected) return undefined
  const commit = history.commits[selected.index]
  const renamedPath = commit.files.find((file) => file.status === 'renamed')?.path
  return {
    id: `rebuild-${selected.index}`,
    kind: 'rebuild',
    title: 'Rebuild',
    summary: `${selected.renames} renames, ${selected.deletions} deletions${selected.merge ? ', and a merge' : ''} mark the strongest structural rewrite.`,
    reason:
      'Each commit is scored as 100 per rename, 25 per deletion, 5 per modification, and 30 for a merge; the earliest exact tie wins.',
    score: selected.score,
    startIndex: Math.max(0, selected.index - 1),
    endIndex: Math.min(history.commits.length - 1, selected.index + 1),
    evidence: [
      evidence(commit, selected.index, selected.merge ? 'Rebuild and merge evidence' : 'Rebuild evidence', renamedPath),
    ],
  }
}

function releaseChapter(
  history: RepositoryHistory,
  releaseIndices: Array<{ index: number; tag: string }>,
): StoryChapter | undefined {
  if (releaseIndices.length < 2) return undefined
  const candidates = releaseIndices.slice(1).map((release, releaseIndex) => {
    const previous = releaseIndices[releaseIndex]
    const score = history.commits
      .slice(previous.index + 1, release.index + 1)
      .reduce((total, commit) => total + commit.files.length, 0)
    return { startIndex: previous.index, endIndex: release.index, score, from: previous.tag, to: release.tag }
  })
  const range = chooseRange(candidates)
  const selected = candidates.find(
    (candidate) => candidate.startIndex === range.startIndex && candidate.endIndex === range.endIndex,
  )!
  return {
    id: `release-${selected.startIndex}-${selected.endIndex}`,
    kind: 'release-range',
    title: 'Release to release',
    summary: `${selected.from} → ${selected.to} spans ${selected.score} recorded file changes.`,
    reason:
      'Consecutive release ranges are ranked by the number of recorded file changes; the earliest exact tie wins.',
    score: selected.score,
    startIndex: selected.startIndex,
    endIndex: selected.endIndex,
    evidence: [
      evidence(history.commits[selected.startIndex], selected.startIndex, selected.from),
      evidence(history.commits[selected.endIndex], selected.endIndex, selected.to),
    ],
  }
}

function ownershipChapter(history: RepositoryHistory): StoryChapter | undefined {
  const districts = new Map<
    string,
    { touches: number; lastAuthor?: string; handoffs: StoryEvidence[]; authors: Map<string, number> }
  >()
  history.commits.forEach((commit, index) => {
    const touched = new Set(commit.files.map((file) => districtForPath(file.path)))
    for (const district of touched) {
      const state = districts.get(district) ?? { touches: 0, handoffs: [], authors: new Map<string, number>() }
      state.touches += 1
      state.authors.set(commit.authorId, (state.authors.get(commit.authorId) ?? 0) + 1)
      if (state.lastAuthor && state.lastAuthor !== commit.authorId) {
        state.handoffs.push(evidence(commit, index, `Ownership handoff in ${district}`))
      }
      state.lastAuthor = commit.authorId
      districts.set(district, state)
    }
  })
  const selected = Array.from(districts, ([district, state]) => ({
    district,
    state,
    score: state.handoffs.length * 100 + state.touches,
  })).sort((left, right) => right.score - left.score || left.district.localeCompare(right.district))[0]
  if (!selected) return undefined
  const dominantTouches = Math.max(...selected.state.authors.values())
  const concentration = Math.round((dominantTouches / selected.state.touches) * 100)
  const firstIndex = Math.min(
    ...Array.from(selected.state.authors.keys()).map((authorId) => {
      const index = history.commits.findIndex(
        (commit) =>
          commit.authorId === authorId && commit.files.some((file) => districtForPath(file.path) === selected.district),
      )
      return index < 0 ? history.commits.length - 1 : index
    }),
  )
  const evidenceItems = selected.state.handoffs.length
    ? selected.state.handoffs.slice(0, 3)
    : [evidence(history.commits[firstIndex], firstIndex, `First recorded ownership in ${selected.district}`)]
  return {
    id: `ownership-${selected.district}`,
    kind: 'ownership',
    title: 'Ownership journey',
    summary: `${selected.district} has ${selected.state.handoffs.length} handoffs across ${selected.state.touches} commit touches.`,
    reason: `Districts are ranked by 100 points per author handoff plus commit touches; the leading author accounts for ${concentration}% of this district's touches.`,
    score: selected.score,
    startIndex: firstIndex,
    endIndex: evidenceItems.at(-1)?.index ?? firstIndex,
    evidence: evidenceItems,
  }
}

function ruinsChapter(history: RepositoryHistory): StoryChapter | undefined {
  const files = new Map<string, { touches: number; deletions: number; deletedAt?: number }>()
  history.commits.forEach((commit, index) => {
    for (const change of commit.files) {
      if (change.status === 'renamed' && change.previousPath) {
        const previous = files.get(change.previousPath)
        files.delete(change.previousPath)
        files.set(change.path, {
          touches: (previous?.touches ?? 0) + 1,
          deletions: (previous?.deletions ?? 0) + change.deletions,
        })
        continue
      }
      const state = files.get(change.path) ?? { touches: 0, deletions: 0 }
      state.touches += 1
      state.deletions += change.deletions
      state.deletedAt = change.status === 'deleted' ? index : undefined
      files.set(change.path, state)
    }
  })
  const selected = Array.from(files, ([path, state]) => ({
    path,
    ...state,
    score: state.touches * 100 + state.deletions,
  }))
    .filter((candidate) => candidate.deletedAt !== undefined)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))[0]
  if (!selected || selected.deletedAt === undefined) return undefined
  const commit = history.commits[selected.deletedAt]
  return {
    id: `ruins-${selected.deletedAt}`,
    kind: 'ruins',
    title: 'Ruins',
    summary: `${selected.path} disappeared after ${selected.touches} recorded touches.`,
    reason:
      'Paths still deleted at the archive endpoint are ranked by 100 points per touch plus deleted lines; lexical path order breaks exact ties.',
    score: selected.score,
    startIndex: Math.max(0, selected.deletedAt - 1),
    endIndex: selected.deletedAt,
    evidence: [evidence(commit, selected.deletedAt, 'Final deletion of a high-activity path', selected.path)],
  }
}

function lastYearChapter(history: RepositoryHistory): StoryChapter {
  const lastIndex = history.commits.length - 1
  const lastTime = new Date(history.commits[lastIndex].authoredAt).getTime()
  const cutoff = lastTime - 365 * 24 * 60 * 60 * 1000
  const startIndex = Math.max(
    0,
    history.commits.findIndex((commit) => new Date(commit.authoredAt).getTime() >= cutoff),
  )
  const changeCount = history.commits.slice(startIndex).reduce((total, commit) => total + commit.files.length, 0)
  return {
    id: `last-year-${startIndex}-${lastIndex}`,
    kind: 'last-year',
    title: 'The last year',
    summary: `${lastIndex - startIndex + 1} commits and ${changeCount} file changes in the final 365-day window.`,
    reason: 'The window is anchored to the archive’s final commit timestamp, not the current clock.',
    score: changeCount,
    startIndex,
    endIndex: lastIndex,
    evidence: [
      evidence(history.commits[startIndex], startIndex, 'Start of final-year window'),
      ...(startIndex < lastIndex ? [evidence(history.commits[lastIndex], lastIndex, 'Archive endpoint')] : []),
    ],
  }
}

export function buildStoryPlan(history: RepositoryHistory): StoryPlan {
  if (history.commits.length === 0) throw new Error('Story Director needs at least one commit.')
  const indexByHash = new Map(history.commits.map((commit, index) => [commit.hash, index]))
  const releaseIndices = history.releases
    .map((release) => ({ index: indexByHash.get(release.commitHash) ?? -1, tag: release.tag }))
    .filter((release) => release.index >= 0)
    .sort((left, right) => left.index - right.index || left.tag.localeCompare(right.tag))
  const chapters = [
    originsChapter(history, releaseIndices),
    growthChapter(history),
    rebuildChapter(history),
    releaseChapter(history, releaseIndices),
    ownershipChapter(history),
    ruinsChapter(history),
    lastYearChapter(history),
  ].filter((chapter): chapter is StoryChapter => Boolean(chapter))
  return {
    version: 1,
    chapters,
    warnings: [
      ...(history.repository.truncated
        ? ['This is partial history. Story Director scores only the commits present in the archive.']
        : []),
      ...(releaseIndices.length === 0 ? ['No release tags are present; release-to-release narration is omitted.'] : []),
    ],
  }
}
