import { describe, expect, it } from 'vitest'
import { publicStoryFixtures } from '../data/story-fixtures'
import { buildArchaeologyDesk } from './archaeology'

describe('evidence-backed archaeology desk', () => {
  it('builds eight deterministic, bounded metrics with navigable evidence', () => {
    const history = publicStoryFixtures[2].history
    const desk = buildArchaeologyDesk(history)

    expect(buildArchaeologyDesk(structuredClone(history))).toEqual(desk)
    expect(desk.sections.map((section) => section.id)).toEqual([
      'paths',
      'churn',
      'concentration',
      'handoffs',
      'dormant',
      'releases',
      'migrations',
      'distribution',
    ])
    for (const section of desk.sections) {
      expect(section.definition.length).toBeGreaterThan(30)
      expect(section.limits.length).toBeGreaterThan(30)
      expect(section.items.length).toBeLessThanOrEqual(5)
      for (const item of section.items) {
        expect(item.evidenceIndex).toBeGreaterThanOrEqual(0)
        expect(item.evidenceIndex).toBeLessThan(history.commits.length)
      }
    }
  })

  it('explains single-author and no-tag limits without inventing handoffs or releases', () => {
    const history = structuredClone(publicStoryFixtures[0].history)
    const onlyAuthor = history.commits[0].authorId
    history.commits.forEach((commit) => {
      commit.authorId = onlyAuthor
    })
    history.contributors = history.contributors.filter((contributor) => contributor.id === onlyAuthor)
    history.releases = []
    const desk = buildArchaeologyDesk(history)

    expect(desk.warnings).toEqual([
      'Single-contributor archive: concentration is descriptive and no author handoffs can be observed.',
      'Fewer than two analyzed release tags: release-to-release deltas are unavailable.',
    ])
    expect(desk.sections.find((section) => section.id === 'handoffs')?.items).toEqual([])
    expect(desk.sections.find((section) => section.id === 'releases')?.items).toEqual([])
  })

  it('keeps monorepo-like districts distinct and labels truncated evidence', () => {
    const history = structuredClone(publicStoryFixtures[1].history)
    history.repository.truncated = true
    history.commits[0].files.push(
      { path: 'packages/core/index.ts', status: 'added', additions: 40, deletions: 0 },
      { path: 'apps/web/main.ts', status: 'added', additions: 30, deletions: 0 },
    )
    history.commits[1].files.push(
      { path: 'packages/core/index.ts', status: 'modified', additions: 8, deletions: 2 },
      { path: 'apps/web/main.ts', status: 'modified', additions: 6, deletions: 1 },
    )
    const desk = buildArchaeologyDesk(history)
    const districts = desk.sections.find((section) => section.id === 'concentration')!.items.map((item) => item.label)

    expect(desk.warnings[0]).toContain('Partial history')
    expect(districts).toEqual(expect.arrayContaining(['apps', 'packages']))
    expect(districts).toContain('root')
  })

  it('ranks rename-heavy migration evidence and preserves its destination path', () => {
    const history = structuredClone(publicStoryFixtures[0].history)
    history.commits[3].files = [
      { path: 'packages/a.ts', previousPath: 'src/a.ts', status: 'renamed', additions: 2, deletions: 1 },
      { path: 'packages/b.ts', previousPath: 'src/b.ts', status: 'renamed', additions: 3, deletions: 1 },
      { path: 'packages/c.ts', previousPath: 'src/c.ts', status: 'renamed', additions: 1, deletions: 1 },
    ]
    const desk = buildArchaeologyDesk(history)
    const migration = desk.sections.find((section) => section.id === 'migrations')!.items[0]

    expect(migration).toMatchObject({ value: '3 renames', evidenceIndex: 3, path: 'packages/a.ts' })
  })
})
