import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { analyzeRepository, analyzeRepositoryStreaming } from './git-reader'

const temporaryRepositories: string[] = []

function git(repository: string, ...args: string[]): void {
  execFileSync('git', ['-C', repository, ...args], { stdio: 'pipe' })
}

afterEach(() => {
  temporaryRepositories.splice(0).forEach((repository) => rmSync(repository, { recursive: true, force: true }))
})

describe('repository analysis integration', () => {
  it('reads actual commits, tags, contributors, renames, and additions', async () => {
    const repository = mkdtempSync(join(tmpdir(), 'reporewind-test-'))
    temporaryRepositories.push(repository)
    mkdirSync(join(repository, 'src'))
    writeFileSync(join(repository, 'src', 'main.ts'), "export const city = 'awake'\n")
    git(repository, 'init', '-b', 'main')
    git(repository, 'config', 'user.name', 'Archive Builder')
    git(repository, 'config', 'user.email', 'archive@example.test')
    git(repository, 'add', '.')
    git(repository, 'commit', '-m', 'Plant the city')
    git(repository, 'tag', 'v0.1.0')
    git(repository, 'mv', 'src/main.ts', 'src/city.ts')
    writeFileSync(join(repository, 'src', 'traveler.ts'), "export const traveler = 'Maya'\n")
    git(repository, 'add', '.')
    git(repository, 'commit', '-m', 'Refactor the avenue')

    const history = analyzeRepository(repository)
    const streamedHistory = await analyzeRepositoryStreaming(repository)
    expect(history.commits).toHaveLength(2)
    expect(history.contributors).toMatchObject([{ name: 'Archive Builder', commits: 2 }])
    expect(history.releases.map((release) => release.tag)).toEqual(['v0.1.0'])
    expect(history.commits[1].files).toContainEqual(
      expect.objectContaining({
        path: 'src/city.ts',
        previousPath: 'src/main.ts',
        status: 'renamed',
      }),
    )
    expect(streamedHistory.commits).toEqual(history.commits)
    expect(history.commits[1].files).toContainEqual(
      expect.objectContaining({
        path: 'src/traveler.ts',
        status: 'added',
        additions: 1,
      }),
    )

    const limited = analyzeRepository(repository, { maxCommits: 1 })
    expect(limited.repository.truncated).toBe(true)
    expect(limited.commits[0].isBaseline).toBe(true)
    expect(limited.releases).toEqual([])
    expect(limited.commits[0].files.map((file) => file.path).sort()).toEqual(['src/city.ts', 'src/traveler.ts'])
  })

  it('replays a truthful first-parent city and records merge topology', () => {
    const repository = mkdtempSync(join(tmpdir(), 'reporewind-merge-test-'))
    temporaryRepositories.push(repository)
    mkdirSync(join(repository, 'src'))
    writeFileSync(join(repository, 'src', 'main.ts'), "export const city = 'awake'\n")
    git(repository, 'init', '-b', 'main')
    git(repository, 'config', 'user.name', 'Archive Builder')
    git(repository, 'config', 'user.email', 'archive@example.test')
    git(repository, 'add', '.')
    git(repository, 'commit', '-m', 'Plant the city')
    git(repository, 'switch', '-c', 'feature/travelers')
    writeFileSync(join(repository, 'src', 'traveler.ts'), "export const traveler = 'Maya'\n")
    git(repository, 'add', '.')
    git(repository, 'commit', '-m', 'Travelers arrive')
    const featureCommit = execFileSync('git', ['-C', repository, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    git(repository, 'switch', 'main')
    writeFileSync(join(repository, 'README.md'), '# Living city\n')
    git(repository, 'add', '.')
    git(repository, 'commit', '-m', 'Document the map')
    git(repository, 'merge', '--no-ff', 'feature/travelers', '-m', 'Merge traveler district')

    const history = analyzeRepository(repository)
    expect(history.commits).toHaveLength(3)
    expect(history.commits.some((commit) => commit.hash === featureCommit)).toBe(false)
    expect(history.commits.at(-1)?.parents).toHaveLength(2)
    expect(history.commits.at(-1)?.files).toContainEqual(
      expect.objectContaining({
        path: 'src/traveler.ts',
        status: 'added',
        additions: 1,
      }),
    )
    expect(history.branches?.map((branch) => branch.name)).toEqual(
      expect.arrayContaining(['main', 'feature/travelers']),
    )
    expect(history.branches?.find((branch) => branch.name === 'main')?.isCurrent).toBe(true)

    const featureHistory = analyzeRepository(repository, { branch: 'feature/travelers' })
    expect(featureHistory.repository.branch).toBe('feature/travelers')
    expect(featureHistory.commits).toHaveLength(2)
    expect(featureHistory.commits.at(-1)?.hash).toBe(featureCommit)
  })

  it('preserves unusual Git paths and rejects option-like refs', async () => {
    const repository = mkdtempSync(join(tmpdir(), 'reporewind-path-test-'))
    temporaryRepositories.push(repository)
    mkdirSync(join(repository, 'src'))
    const unusualPath = join(repository, 'src', ' city\tmap.ts ')
    writeFileSync(unusualPath, "export const map = 'city'\n")
    git(repository, 'init', '-b', 'main')
    git(repository, 'config', 'user.name', 'Archive Builder')
    git(repository, 'config', 'user.email', 'archive@example.test')
    git(repository, 'add', '.')
    git(repository, 'commit', '-m', 'Map unusual streets')

    const history = await analyzeRepositoryStreaming(repository)
    expect(history.commits[0].files).toContainEqual(
      expect.objectContaining({
        path: 'src/ city\tmap.ts ',
        status: 'added',
      }),
    )
    expect(() => analyzeRepository(repository, { branch: '--all' })).toThrow('not valid')
    expect(() => analyzeRepository(repository, { maxCommits: -1 })).toThrow('positive integer')
  })
})
