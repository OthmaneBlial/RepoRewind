import { describe, expect, it } from 'vitest'
import { publicStoryFixtures } from '../data/story-fixtures'
import { buildStoryPlan } from './story-director'

describe('deterministic Story Director', () => {
  it('produces the same scored plan and Git evidence for the same archive', () => {
    const history = publicStoryFixtures[2].history
    const first = buildStoryPlan(history)
    const second = buildStoryPlan(structuredClone(history))

    expect(second).toEqual(first)
    expect(first.chapters.map((chapter) => chapter.kind)).toEqual(
      expect.arrayContaining(['origins', 'growth', 'rebuild', 'release-range', 'ownership', 'last-year']),
    )
    for (const chapter of first.chapters) {
      expect(chapter.reason.length).toBeGreaterThan(20)
      expect(chapter.startIndex).toBeGreaterThanOrEqual(0)
      expect(chapter.endIndex).toBeLessThan(history.commits.length)
      expect(chapter.evidence.length).toBeGreaterThan(0)
      for (const item of chapter.evidence) {
        expect(history.commits[item.index].hash).toBe(item.commitHash)
      }
    }
  })

  it('uses the earliest window for exact growth ties', () => {
    const history = structuredClone(publicStoryFixtures[0].history)
    history.commits.forEach((commit) => {
      commit.message = 'Routine change'
      commit.additions = 0
      commit.deletions = 0
      commit.files = commit.files.slice(0, 1).map((file) => ({
        ...file,
        status: 'modified',
        additions: 0,
        deletions: 0,
        previousPath: undefined,
      }))
    })

    const growth = buildStoryPlan(history).chapters.find((chapter) => chapter.kind === 'growth')
    expect(growth).toMatchObject({ startIndex: 0, endIndex: 1, score: 0 })
  })

  it('selects rename and merge evidence for the strongest rebuild', () => {
    const history = structuredClone(publicStoryFixtures[0].history)
    history.commits.forEach((commit) => {
      commit.message = 'Routine change'
      commit.parents = commit.parents.slice(0, 1)
      commit.files = commit.files.slice(0, 1).map((file) => ({ ...file, status: 'modified', previousPath: undefined }))
    })
    history.commits[2].parents = ['parent-a', 'parent-b']
    history.commits[2].files = [
      { path: 'src/new.ts', previousPath: 'src/old.ts', status: 'renamed', additions: 3, deletions: 1 },
    ]

    const rebuild = buildStoryPlan(history).chapters.find((chapter) => chapter.kind === 'rebuild')
    expect(rebuild).toMatchObject({ startIndex: 1, endIndex: 3, score: 130 })
    expect(rebuild?.evidence[0]).toMatchObject({ index: 2, path: 'src/new.ts', label: 'Rebuild and merge evidence' })
  })

  it('labels truncated archives and omits release narration when tags are absent', () => {
    const history = structuredClone(publicStoryFixtures[0].history)
    history.repository.truncated = true
    const plan = buildStoryPlan(history)

    expect(plan.chapters.some((chapter) => chapter.kind === 'release-range')).toBe(false)
    expect(plan.warnings).toEqual([
      'This is partial history. Story Director scores only the commits present in the archive.',
      'No release tags are present; release-to-release narration is omitted.',
    ])
    expect(plan.chapters.find((chapter) => chapter.kind === 'origins')?.reason).toContain('No release tags exist')
  })

  it('produces useful bounded stories for three versioned public fixtures of different sizes', () => {
    const sizes = publicStoryFixtures.map(({ history }) => history.commits.length)
    expect(new Set(sizes).size).toBe(3)

    for (const fixture of publicStoryFixtures) {
      const plan = buildStoryPlan(fixture.history)
      expect(fixture.id).toMatch(/-v1$/)
      expect(plan.chapters.length).toBeGreaterThanOrEqual(3)
      expect(plan.chapters.map((chapter) => chapter.kind)).toEqual(
        expect.arrayContaining(['origins', 'growth', 'last-year']),
      )
    }
  })
})
