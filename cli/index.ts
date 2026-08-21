#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { analyzeRepositoryStreaming } from './git-reader'

const packageVersion = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version

function printHelp(): void {
  process.stdout.write(`RepoRewind — turn Git history into a living city

Usage:
  reporewind analyze [repository] [options]

Options:
  -o, --output <file>       Output history file (default: reporewind-history.json)
      --stdout              Write only the history JSON to stdout
      --max-commits <count> Limit imported commits for very large repositories
      --branch <ref>        Analyze another branch or ref instead of the checked-out branch
      --include-emails      Include contributor email addresses in the export
  -f, --force               Replace an existing output file
  -q, --quiet               Suppress progress output
  -v, --version             Print the RepoRewind version
  -h, --help                Show this help

Examples:
  reporewind analyze ~/Projects/my-app -o ./my-app-history.json
  reporewind analyze . --branch release/3.x --max-commits 5000
  reporewind analyze . --stdout > reporewind-history.json
`)
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

  const output = typeof parsed.values.output === 'string' ? parsed.values.output : undefined
  const writeToStdout = parsed.values.stdout === true
  const includeEmails = parsed.values['include-emails'] === true
  const force = parsed.values.force === true
  const branch = typeof parsed.values.branch === 'string' ? parsed.values.branch : undefined
  const maxCommitsOption = typeof parsed.values['max-commits'] === 'string' ? parsed.values['max-commits'] : undefined

  if (parsed.values.version === true) {
    process.stdout.write(`${packageVersion}\n`)
    return
  }
  if (parsed.values.help === true || parsed.positionals.length === 0) {
    printHelp()
    return
  }

  const [command, repositoryPath = '.', ...extraPositionals] = parsed.positionals
  if (command !== 'analyze') {
    process.stderr.write(`Unknown command: ${command}\nRun reporewind --help for usage.\n`)
    process.exitCode = 1
    return
  }
  if (extraPositionals.length > 0) {
    process.stderr.write(`Unexpected argument: ${extraPositionals[0]}\nRun reporewind --help for usage.\n`)
    process.exitCode = 1
    return
  }
  if (writeToStdout && output) {
    process.stderr.write('Use either --stdout or --output, not both.\n')
    process.exitCode = 1
    return
  }

  const maxCommits = maxCommitsOption === undefined ? undefined : Number(maxCommitsOption)
  if (maxCommits !== undefined && (!Number.isSafeInteger(maxCommits) || maxCommits <= 0)) {
    process.stderr.write('The --max-commits option requires a positive integer.\n')
    process.exitCode = 1
    return
  }

  const quiet = parsed.values.quiet === true || writeToStdout
  const outputPath = resolve(output ?? 'reporewind-history.json')
  try {
    if (!quiet) process.stdout.write(`Analyzing ${resolve(repositoryPath)}…\n`)
    const history = await analyzeRepositoryStreaming(repositoryPath, {
      maxCommits,
      includeEmails,
      branch,
    })
    const serialized = `${JSON.stringify(history, null, 2)}\n`
    if (writeToStdout) {
      process.stdout.write(serialized)
      return
    }

    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, serialized, { encoding: 'utf8', mode: 0o600, flag: force ? 'w' : 'wx' })
    if (!quiet) {
      const count = (value: number, singular: string) =>
        `${value.toLocaleString()} ${singular}${value === 1 ? '' : 's'}`
      process.stdout.write(
        `\n${count(history.commits.length, 'commit')} · ${count(history.contributors.length, 'traveler')} · ${count(history.releases.length, 'release')}\n`,
      )
      process.stdout.write(`History written to ${outputPath}\n`)
    }
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
