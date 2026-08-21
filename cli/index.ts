#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { analyzeRepositoryStreaming } from './git-reader'

function printHelp(): void {
  console.log(`RepoRewind — turn Git history into a living city

Usage:
  reporewind analyze [repository] [options]

Options:
  -o, --output <file>       Output history file (default: reporewind-history.json)
  --max-commits <count>     Limit imported commits for very large repositories
  --branch <ref>            Analyze another branch or ref instead of the checked-out branch
  --include-emails          Include contributor email addresses in the export
  -h, --help                Show this help

Example:
  reporewind analyze ~/Projects/my-app -o ./my-app-history.json`)
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printHelp()
  process.exit(0)
}

if (args[0] !== 'analyze') {
  console.error(`Unknown command: ${args[0]}\n`)
  printHelp()
  process.exit(1)
}

const positional = args.slice(1).filter((arg, index, values) => {
  if (arg.startsWith('-')) return false
  const previous = values[index - 1]
  return previous !== '--output' && previous !== '-o' && previous !== '--max-commits' && previous !== '--branch'
})
const repositoryPath = positional[0] ?? '.'
const outputIndex = Math.max(args.indexOf('--output'), args.indexOf('-o'))
if (outputIndex >= 0 && !args[outputIndex + 1]) {
  console.error('The --output option requires a file path.')
  process.exit(1)
}
const outputPath = resolve(outputIndex >= 0 ? args[outputIndex + 1] : 'reporewind-history.json')
const maxIndex = args.indexOf('--max-commits')
const maxCommits = maxIndex >= 0 ? Number.parseInt(args[maxIndex + 1], 10) : undefined
const branchIndex = args.indexOf('--branch')
const branch = branchIndex >= 0 ? args[branchIndex + 1] : undefined
if (maxIndex >= 0 && (!Number.isFinite(maxCommits) || (maxCommits ?? 0) <= 0)) {
  console.error('The --max-commits option requires a positive number.')
  process.exit(1)
}
if (branchIndex >= 0 && !branch) {
  console.error('The --branch option requires a Git ref.')
  process.exit(1)
}

try {
  console.log(`Analyzing ${resolve(repositoryPath)}…`)
  const history = await analyzeRepositoryStreaming(repositoryPath, {
    maxCommits: Number.isFinite(maxCommits) ? maxCommits : undefined,
    includeEmails: args.includes('--include-emails'),
    branch,
  })
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(history, null, 2)}\n`, 'utf8')
  const count = (value: number, singular: string) => `${value.toLocaleString()} ${singular}${value === 1 ? '' : 's'}`
  console.log(`\n${count(history.commits.length, 'commit')} · ${count(history.contributors.length, 'traveler')} · ${count(history.releases.length, 'release')}`)
  console.log(`History written to ${outputPath}`)
} catch (error) {
  console.error(`RepoRewind could not analyze this repository: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
