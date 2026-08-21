// @vitest-environment node

import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const temporaryDirectories: string[] = []

async function runCli(...args: string[]) {
  return execFileAsync(process.execPath, ['--import', 'tsx', 'cli/index.ts', ...args], {
    cwd: projectRoot,
    env: { ...process.env, NO_COLOR: '1' },
  })
}

async function createRepository(): Promise<string> {
  const repository = await mkdtemp(join(tmpdir(), 'reporewind-cli-'))
  temporaryDirectories.push(repository)
  await execFileAsync('git', ['init', '--quiet'], { cwd: repository })
  await execFileAsync('git', ['config', 'user.name', 'CLI Fixture'], { cwd: repository })
  await execFileAsync('git', ['config', 'user.email', 'fixture@example.test'], { cwd: repository })
  await writeFile(join(repository, 'README.md'), '# CLI fixture\n')
  await execFileAsync('git', ['add', 'README.md'], { cwd: repository })
  await execFileAsync('git', ['commit', '--quiet', '-m', 'Create fixture'], { cwd: repository })
  return repository
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('RepoRewind CLI', () => {
  it('reports its package version without requiring a command', async () => {
    const { stdout, stderr } = await runCli('--version')
    expect(stdout.trim()).toBe('0.1.0')
    expect(stderr).toBe('')
  })

  it('rejects unknown options with an actionable non-zero failure', async () => {
    await expect(runCli('analyze', '.', '--unknown-option')).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Run reporewind --help for usage.'),
    })
  })

  it('emits machine-readable JSON without progress text or contributor emails', async () => {
    const repository = await createRepository()
    const { stdout, stderr } = await runCli('analyze', repository, '--stdout')
    const history = JSON.parse(stdout) as {
      repository: { name: string }
      commits: unknown[]
      contributors: Array<{ email?: string }>
    }

    expect(stderr).toBe('')
    expect(history.repository.name).toBe(basename(repository))
    expect(history.commits).toHaveLength(1)
    expect(history.contributors[0].email).toBeUndefined()
  })

  it('refuses to overwrite an archive unless --force is explicit', async () => {
    const repository = await createRepository()
    const output = join(repository, 'history.json')
    await writeFile(output, 'keep this file\n')

    await expect(runCli('analyze', repository, '--output', output)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('add --force'),
    })
    expect(await readFile(output, 'utf8')).toBe('keep this file\n')

    await runCli('analyze', repository, '--output', output, '--force', '--quiet')
    expect(JSON.parse(await readFile(output, 'utf8'))).toMatchObject({
      repository: { name: basename(repository) },
    })
  })
})
