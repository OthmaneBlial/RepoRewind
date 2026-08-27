import type { RepositoryHistory } from '../core/types'
import { sampleHistory } from './sample-history'

function boundedFixture(id: string, commitCount: number, includeReleases: boolean): RepositoryHistory {
  const commits = structuredClone(sampleHistory.commits.slice(0, commitCount))
  const hashes = new Set(commits.map((commit) => commit.hash))
  const contributors = sampleHistory.contributors
    .filter((contributor) => commits.some((commit) => commit.authorId === contributor.id))
    .map((contributor) => {
      const authored = commits.filter((commit) => commit.authorId === contributor.id)
      return {
        ...contributor,
        commits: authored.length,
        additions: authored.reduce((total, commit) => total + commit.additions, 0),
        deletions: authored.reduce((total, commit) => total + commit.deletions, 0),
      }
    })
  return {
    schemaVersion: 1,
    repository: {
      ...sampleHistory.repository,
      name: `public-story-${id}`,
      branch: 'main',
      remote: undefined,
      generatedAt: commits.at(-1)!.authoredAt,
      firstCommitAt: commits[0].authoredAt,
      lastCommitAt: commits.at(-1)!.authoredAt,
    },
    contributors,
    commits,
    releases: includeReleases
      ? structuredClone(sampleHistory.releases.filter((release) => hashes.has(release.commitHash)))
      : [],
    branches: undefined,
  }
}

export const publicStoryFixtures = [
  { id: 'small-no-tags-v1', history: boundedFixture('small', 5, false) },
  { id: 'medium-release-v1', history: boundedFixture('medium', 13, true) },
  { id: 'large-decade-v1', history: structuredClone(sampleHistory) },
] as const
