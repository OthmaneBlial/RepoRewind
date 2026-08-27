import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const taskDirectory = resolve(root, '.github/contributor-issues')
const taskFiles = (await readdir(taskDirectory)).filter((filename) => filename.endsWith('.md')).sort()
const requiredSections = ['## Outcome', '## Scope', '## Relevant files', '## Acceptance criteria', '## Test commands']
const failures = []

if (taskFiles.length < 5 || taskFiles.length > 10) {
  failures.push(`Expected 5–10 maintained starter issues; found ${taskFiles.length}.`)
}

for (const filename of taskFiles) {
  const contents = await readFile(resolve(taskDirectory, filename), 'utf8')
  if (!contents.startsWith('<!-- labels: ')) failures.push(`${filename}: missing machine-readable label declaration.`)
  if (!/^# .+/m.test(contents)) failures.push(`${filename}: missing issue title.`)
  for (const heading of requiredSections) {
    if (!contents.includes(heading)) failures.push(`${filename}: missing ${heading}.`)
  }
  if (!contents.includes('- [ ] ')) failures.push(`${filename}: acceptance criteria are not checkable.`)
  if (!contents.includes('```bash')) failures.push(`${filename}: test commands are not executable.`)
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(
    `Checked ${taskFiles.length} maintained contributor issues with complete acceptance contracts.\n`,
  )
}
