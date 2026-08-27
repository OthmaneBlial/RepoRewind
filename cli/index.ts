#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { validateHistory } from '../src/core/history'
import type { RepositoryHistory } from '../src/core/types'
import { analyzeRepositoryStreaming } from './git-reader'
import { openViewerInBrowser, startViewerServer, type ViewerSession } from './viewer-server'

const packageVersion = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version

function printHelp(): void {
  process.stdout.write(`RepoRewind — turn Git history into a living city

Usage:
  reporewind [repository] [options]          Analyze and open the local viewer
  reporewind analyze [repository] [options] Write a portable history archive

Viewer options:
      --no-open             Print the loopback URL without opening a browser

Analysis options:
      --max-commits <count> Limit imported commits for very large repositories
      --branch <ref>        Analyze another branch or ref instead of the checked-out branch
      --include-emails      Include contributor email addresses in the in-memory/archive data
  -q, --quiet               Suppress analysis progress output

Archive-only options:
  -o, --output <file>       Output history file (default: reporewind-history.json)
      --stdout              Write only the history JSON to stdout
  -f, --force               Replace an existing output file

General options:
  -v, --version             Print the RepoRewind version
  -h, --help                Show this help

Examples:
  reporewind .
  reporewind ~/Projects/my-app --branch release/3.x --max-commits 5000
  reporewind . --no-open
  reporewind analyze ~/Projects/my-app -o ./my-app-history.json
  reporewind analyze . --stdout > reporewind-history.json
`)
}

function writeArchive(outputPath: string, serialized: string, force: boolean): void {
  mkdirSync(dirname(outputPath), { recursive: true })
  if (!force) {
    writeFileSync(outputPath, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    return
  }

  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporaryPath, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    renameSync(temporaryPath, outputPath)
    if (process.platform !== 'win32') chmodSync(outputPath, 0o600)
  } finally {
    rmSync(temporaryPath, { force: true })
  }
}

function count(value: number, singular: string): string {
  return `${value.toLocaleString()} ${singular}${value === 1 ? '' : 's'}`
}

function historySummary(history: RepositoryHistory): string {
  return `${count(history.commits.length, 'commit')} · ${count(history.contributors.length, 'traveler')} · ${count(history.releases.length, 'release')}`
}

async function waitForShutdown(session: ViewerSession): Promise<void> {
  await new Promise<void>((resolveShutdown, rejectShutdown) => {
    let closing = false
    const shutdown = () => {
      if (closing) return
      closing = true
      process.off('SIGINT', shutdown)
      process.off('SIGTERM', shutdown)
      session.close().then(resolveShutdown, rejectShutdown)
    }
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  })
}

async function main(): Promise<void> {
  let parsed: ReturnType<typeof parseArgs>
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      strict: true,
      options: {
        output: { type: 'string', short: 'o' },
        stdout: { type: 'boolean', default: false },
        'max-commits': { type: 'string' },
        branch: { type: 'string' },
        'include-emails': { type: 'boolean', default: false },
        'no-open': { type: 'boolean', default: false },
        force: { type: 'boolean', short: 'f', default: false },
        quiet: { type: 'boolean', short: 'q', default: false },
        version: { type: 'boolean', short: 'v', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    })
  } catch (error) {
    process.stderr.write(
      `RepoRewind: ${error instanceof Error ? error.message : String(error)}\nRun reporewind --help for usage.\n`,
    )
    process.exitCode = 1
    return
  }

  if (parsed.values.version === true) {
    process.stdout.write(`${packageVersion}\n`)
    return
  }
  if (parsed.values.help === true) {
    printHelp()
    return
  }

  const archiveMode = parsed.positionals[0] === 'analyze'
  const repositoryPath = archiveMode ? (parsed.positionals[1] ?? '.') : (parsed.positionals[0] ?? '.')
  const extraPositionals = archiveMode ? parsed.positionals.slice(2) : parsed.positionals.slice(1)
  if (extraPositionals.length > 0) {
    process.stderr.write(`Unexpected argument: ${extraPositionals[0]}\nRun reporewind --help for usage.\n`)
    process.exitCode = 1
    return
  }

  const output = typeof parsed.values.output === 'string' ? parsed.values.output : undefined
  const writeToStdout = parsed.values.stdout === true
  const force = parsed.values.force === true
  const noOpen = parsed.values['no-open'] === true
  if (!archiveMode && (output || writeToStdout || force)) {
    process.stderr.write('The --output, --stdout, and --force options are available only with reporewind analyze.\n')
    process.exitCode = 1
    return
  }
  if (archiveMode && noOpen) {
    process.stderr.write('The --no-open option is available only for the local viewer.\n')
    process.exitCode = 1
    return
  }
  if (writeToStdout && output) {
    process.stderr.write('Use either --stdout or --output, not both.\n')
    process.exitCode = 1
    return
  }

  const maxCommitsOption = typeof parsed.values['max-commits'] === 'string' ? parsed.values['max-commits'] : undefined
  const maxCommits = maxCommitsOption === undefined ? undefined : Number(maxCommitsOption)
  if (maxCommits !== undefined && (!Number.isSafeInteger(maxCommits) || maxCommits <= 0)) {
    process.stderr.write('The --max-commits option requires a positive integer.\n')
    process.exitCode = 1
    return
  }

  const includeEmails = parsed.values['include-emails'] === true
  const branch = typeof parsed.values.branch === 'string' ? parsed.values.branch : undefined
  const quiet = parsed.values.quiet === true || writeToStdout
  const outputPath = resolve(output ?? 'reporewind-history.json')
  try {
    if (!quiet) process.stdout.write(`Analyzing ${resolve(repositoryPath)}…\n`)
    const history = validateHistory(
      await analyzeRepositoryStreaming(repositoryPath, {
        maxCommits,
        includeEmails,
        branch,
      }),
    )

    if (archiveMode) {
      const serialized = `${JSON.stringify(history, null, 2)}\n`
      if (writeToStdout) {
        process.stdout.write(serialized)
        return
      }
      writeArchive(outputPath, serialized, force)
      if (!quiet) {
        process.stdout.write(`\n${historySummary(history)}\n`)
        process.stdout.write(`History written to ${outputPath}\n`)
      }
      return
    }

    const session = await startViewerServer({ history })
    process.stdout.write(`\n${historySummary(history)}\n`)
    process.stdout.write(`Local viewer: ${session.url}\n`)
    process.stdout.write('Repository data stays on this machine. Press Ctrl+C to stop the viewer.\n')
    if (!noOpen && !(await openViewerInBrowser(session.url))) {
      process.stdout.write('The browser could not be opened automatically. Open the local viewer URL above.\n')
    }
    await waitForShutdown(session)
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    const message =
      code === 'EEXIST'
        ? `Output file already exists: ${outputPath}. Choose another --output path or add --force.`
        : error instanceof Error
          ? error.message
          : String(error)
    process.stderr.write(`RepoRewind failed: ${message}\n`)
    process.exitCode = 1
  }
}

void main()
