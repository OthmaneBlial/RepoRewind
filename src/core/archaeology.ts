import type { RepositoryHistory } from './types'

export type ArchaeologySectionId =
  'paths' | 'churn' | 'concentration' | 'handoffs' | 'dormant' | 'releases' | 'migrations' | 'distribution'

export interface ArchaeologyEvidenceItem {
  id: string
  label: string
  value: string
  detail: string
  evidenceIndex: number
  path?: string
}

export interface ArchaeologySection {
  id: ArchaeologySectionId
  title: string
  definition: string
  limits: string
  items: ArchaeologyEvidenceItem[]
}

export interface ArchaeologyDesk {
  version: 1
  sections: ArchaeologySection[]
  warnings: string[]
}

const ITEM_LIMIT = 5

function districtForPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments.length > 1 ? segments[0] : 'root'
}

function countLabel(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`
}

function sortRanked<T extends { score: number; label: string }>(items: T[]): T[] {
  return items.sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
}

export function buildArchaeologyDesk(history: RepositoryHistory): ArchaeologyDesk {
  if (history.commits.length === 0) throw new Error('The archaeology desk needs at least one commit.')
  const contributorById = new Map(history.contributors.map((contributor) => [contributor.id, contributor]))
  const pathActivity = new Map<
    string,
    { touches: number; churn: number; lastIndex: number; alive: boolean; deletedAt?: number }
  >()
  const districts = new Map<
    string,
    {
      touches: number
      authors: Map<string, number>
      lastAuthor?: string
      handoffs: number
      lastHandoffIndex?: number
      lastIndex: number
    }
  >()

  history.commits.forEach((commit, index) => {
    const touchedDistricts = new Set<string>()
    for (const change of commit.files) {
      if (change.status === 'renamed' && change.previousPath) {
        const previous = pathActivity.get(change.previousPath)
        pathActivity.delete(change.previousPath)
        pathActivity.set(change.path, {
          touches: (previous?.touches ?? 0) + 1,
          churn: (previous?.churn ?? 0) + change.additions + change.deletions,
          lastIndex: index,
          alive: true,
        })
      } else {
        const state = pathActivity.get(change.path) ?? {
          touches: 0,
          churn: 0,
          lastIndex: index,
          alive: true,
        }
        state.touches += 1
        state.churn += change.additions + change.deletions
        state.lastIndex = index
        state.alive = change.status !== 'deleted'
        state.deletedAt = change.status === 'deleted' ? index : undefined
        pathActivity.set(change.path, state)
      }
      touchedDistricts.add(districtForPath(change.path))
    }
    for (const district of touchedDistricts) {
      const state = districts.get(district) ?? {
        touches: 0,
        authors: new Map<string, number>(),
        handoffs: 0,
        lastIndex: index,
      }
      state.touches += 1
      state.authors.set(commit.authorId, (state.authors.get(commit.authorId) ?? 0) + 1)
      if (state.lastAuthor && state.lastAuthor !== commit.authorId) {
        state.handoffs += 1
        state.lastHandoffIndex = index
      }
      state.lastAuthor = commit.authorId
      state.lastIndex = index
      districts.set(district, state)
    }
  })

  const paths: ArchaeologySection = {
    id: 'paths',
    title: 'Frequently changed paths',
    definition:
      'Ranks the current rename-aware path by the number of recorded file-change entries, then total added plus deleted lines.',
    limits: `Shows at most ${ITEM_LIMIT} paths. Touch count measures commits containing the path, not time spent or code quality.`,
    items: sortRanked(
      Array.from(pathActivity, ([path, state]) => ({
        label: path,
        score: state.touches * 1_000_000 + state.churn,
        state,
      })),
    )
      .slice(0, ITEM_LIMIT)
      .map(({ label, state }) => ({
        id: `path:${label}`,
        label,
        value: countLabel(state.touches, 'touch', 'touches'),
        detail: `${state.churn.toLocaleString()} added + deleted lines`,
        evidenceIndex: state.lastIndex,
        path: label,
      })),
  }

  const recentStart = Math.max(0, Math.floor(history.commits.length * 0.8))
  const churnFor = (start: number, end: number) =>
    history.commits.slice(start, end).reduce(
      (totals, commit) => ({
        commits: totals.commits + 1,
        churn: totals.churn + commit.additions + commit.deletions,
      }),
      { commits: 0, churn: 0 },
    )
  const historical = churnFor(0, recentStart)
  const recent = churnFor(recentStart, history.commits.length)
  const churn: ArchaeologySection = {
    id: 'churn',
    title: 'Recent versus historical churn',
    definition: 'Compares added plus deleted lines per commit in the final 20% of the archive with the preceding 80%.',
    limits:
      'The split is by commit count, not calendar time. Generated files and formatting changes can dominate line totals.',
    items: [
      {
        id: 'churn:recent',
        label: 'Recent 20%',
        value: `${recent.churn.toLocaleString()} lines`,
        detail: `${recent.commits} commits · ${Math.round(recent.churn / Math.max(1, recent.commits)).toLocaleString()} per commit`,
        evidenceIndex: recentStart,
      },
      {
        id: 'churn:historical',
        label: 'Earlier 80%',
        value: `${historical.churn.toLocaleString()} lines`,
        detail: `${historical.commits} commits · ${Math.round(historical.churn / Math.max(1, historical.commits)).toLocaleString()} per commit`,
        evidenceIndex: 0,
      },
    ],
  }

  const concentration: ArchaeologySection = {
    id: 'concentration',
    title: 'Contributor concentration by district',
    definition:
      'For each top-level path district, reports the largest share of recorded commit touches by one contributor.',
    limits: `Shows at most ${ITEM_LIMIT} districts. This is observed commit concentration, not maintainership, ownership, or authority.`,
    items: sortRanked(
      Array.from(districts, ([district, state]) => {
        const leading = Array.from(state.authors, ([authorId, touches]) => ({ authorId, touches })).sort(
          (left, right) => right.touches - left.touches || left.authorId.localeCompare(right.authorId),
        )[0]
        const share = Math.round((leading.touches / state.touches) * 100)
        return { label: district, score: share * 1_000 + state.touches, state, leading, share }
      }),
    )
      .slice(0, ITEM_LIMIT)
      .map(({ label, state, leading, share }) => ({
        id: `concentration:${label}`,
        label,
        value: `${share}% · ${contributorById.get(leading.authorId)?.name ?? 'Unknown contributor'}`,
        detail: `${leading.touches} of ${state.touches} district commit touches`,
        evidenceIndex: state.lastIndex,
      })),
  }

  const handoffs: ArchaeologySection = {
    id: 'handoffs',
    title: 'Ownership handoffs',
    definition:
      'Counts transitions where consecutive commits touching a district were authored by different contributors.',
    limits: `Shows at most ${ITEM_LIMIT} districts. Alternating authorship is evidence of handoffs, not proof of formal ownership transfer.`,
    items: sortRanked(
      Array.from(districts, ([district, state]) => ({ label: district, score: state.handoffs, state })).filter(
        ({ state }) => state.handoffs > 0,
      ),
    )
      .slice(0, ITEM_LIMIT)
      .map(({ label, state }) => ({
        id: `handoff:${label}`,
        label,
        value: countLabel(state.handoffs, 'handoff'),
        detail: `${countLabel(state.touches, 'commit')} touched this district`,
        evidenceIndex: state.lastHandoffIndex ?? state.lastIndex,
      })),
  }

  const dormantCutoff = Math.floor(history.commits.length * 0.75)
  const dormant: ArchaeologySection = {
    id: 'dormant',
    title: 'Dormant or deleted high-activity paths',
    definition:
      'Ranks frequently touched paths that are deleted at the endpoint or were last touched before the final quarter of commits.',
    limits: `Shows at most ${ITEM_LIMIT} paths. Dormant means no later recorded touch in this archive, not unused or obsolete code.`,
    items: sortRanked(
      Array.from(pathActivity, ([path, state]) => ({
        label: path,
        score: state.touches * 1_000 + state.churn,
        state,
      })).filter(({ state }) => !state.alive || state.lastIndex < dormantCutoff),
    )
      .slice(0, ITEM_LIMIT)
      .map(({ label, state }) => ({
        id: `dormant:${label}`,
        label,
        value: state.alive ? 'Dormant in final quarter' : 'Deleted at endpoint',
        detail: `${countLabel(state.touches, 'touch', 'touches')} · ${state.churn.toLocaleString()} lines changed`,
        evidenceIndex: state.deletedAt ?? state.lastIndex,
        path: label,
      })),
  }

  const indexByHash = new Map(history.commits.map((commit, index) => [commit.hash, index]))
  const releasePoints = history.releases
    .map((release) => ({ ...release, index: indexByHash.get(release.commitHash) ?? -1 }))
    .filter((release) => release.index >= 0)
    .sort((left, right) => left.index - right.index || left.tag.localeCompare(right.tag))
  const releases: ArchaeologySection = {
    id: 'releases',
    title: 'Release-to-release structural deltas',
    definition: 'For each consecutive tag pair, totals recorded file-change entries and net added minus deleted lines.',
    limits: `Shows at most ${ITEM_LIMIT} consecutive ranges. Missing or lightweight tags outside the analyzed ref cannot appear.`,
    items: sortRanked(
      releasePoints.slice(1).map((release, offset) => {
        const previous = releasePoints[offset]
        const commits = history.commits.slice(previous.index + 1, release.index + 1)
        const fileChanges = commits.reduce((total, commit) => total + commit.files.length, 0)
        const netLines = commits.reduce((total, commit) => total + commit.additions - commit.deletions, 0)
        return {
          label: `${previous.tag} → ${release.tag}`,
          score: fileChanges,
          release,
          fileChanges,
          netLines,
        }
      }),
    )
      .slice(0, ITEM_LIMIT)
      .map(({ label, release, fileChanges, netLines }) => ({
        id: `release:${label}`,
        label,
        value: `${fileChanges} file changes`,
        detail: `${netLines >= 0 ? '+' : ''}${netLines.toLocaleString()} net lines`,
        evidenceIndex: release.index,
      })),
  }

  const migrations: ArchaeologySection = {
    id: 'migrations',
    title: 'Large renames and migrations',
    definition: 'Ranks commits by renamed paths, then total files changed in that commit.',
    limits: `Shows at most ${ITEM_LIMIT} commits. Rename detection depends on what Git reported during analysis.`,
    items: sortRanked(
      history.commits
        .map((commit, index) => {
          const renamed = commit.files.filter((file) => file.status === 'renamed')
          return {
            label: commit.message,
            score: renamed.length * 1_000 + commit.files.length,
            commit,
            index,
            renamed,
          }
        })
        .filter(({ renamed }) => renamed.length > 0),
    )
      .slice(0, ITEM_LIMIT)
      .map(({ label, commit, index, renamed }) => ({
        id: `migration:${commit.hash}`,
        label,
        value: countLabel(renamed.length, 'rename'),
        detail: `${countLabel(commit.files.length, 'file')} changed in the commit`,
        evidenceIndex: index,
        path: renamed[0].path,
      })),
  }

  const years = new Map<string, { commits: number; churn: number; firstIndex: number }>()
  history.commits.forEach((commit, index) => {
    const year = new Date(commit.authoredAt).getUTCFullYear().toString()
    const state = years.get(year) ?? { commits: 0, churn: 0, firstIndex: index }
    state.commits += 1
    state.churn += commit.additions + commit.deletions
    years.set(year, state)
  })
  const distribution: ArchaeologySection = {
    id: 'distribution',
    title: 'Activity distribution over time',
    definition: 'Groups commits by UTC calendar year and reports commit count plus added and deleted lines.',
    limits: `Shows at most ${ITEM_LIMIT} highest-commit years. Author date and uneven commit size can distort calendar comparisons.`,
    items: sortRanked(
      Array.from(years, ([year, state]) => ({ label: year, score: state.commits * 1_000_000 + state.churn, state })),
    )
      .slice(0, ITEM_LIMIT)
      .map(({ label, state }) => ({
        id: `year:${label}`,
        label,
        value: countLabel(state.commits, 'commit'),
        detail: `${state.churn.toLocaleString()} added + deleted lines`,
        evidenceIndex: state.firstIndex,
      })),
  }

  return {
    version: 1,
    sections: [paths, churn, concentration, handoffs, dormant, releases, migrations, distribution],
    warnings: [
      ...(history.repository.truncated
        ? ['Partial history: rankings and comparisons cover only the commits present in this archive.']
        : []),
      ...(history.contributors.length === 1
        ? ['Single-contributor archive: concentration is descriptive and no author handoffs can be observed.']
        : []),
      ...(releasePoints.length < 2
        ? ['Fewer than two analyzed release tags: release-to-release deltas are unavailable.']
        : []),
    ],
  }
}
