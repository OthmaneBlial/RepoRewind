import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const ignoredDirectories = new Set(['.git', 'dist', 'dist-cli', 'node_modules'])

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...(await markdownFiles(join(directory, entry.name))))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(join(directory, entry.name))
    }
  }
  return files
}

function localTargets(markdown) {
  const targets = []
  const pattern = /!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\)/g
  for (const match of markdown.matchAll(pattern)) targets.push(match[1] ?? match[2])
  return targets
}

const failures = []
const files = await markdownFiles(root)
for (const file of files) {
  const markdown = await readFile(file, 'utf8')
  for (const rawTarget of localTargets(markdown)) {
    if (!rawTarget || rawTarget.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(rawTarget)) continue
    const decodedTarget = decodeURIComponent(rawTarget.split('#')[0])
    const target = resolve(dirname(file), decodedTarget)
    if (relative(root, target).startsWith('..')) {
      failures.push(`${relative(root, file)}: link escapes the repository: ${rawTarget}`)
      continue
    }
    try {
      await access(target)
    } catch {
      failures.push(`${relative(root, file)}: missing local link target: ${rawTarget}`)
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Checked ${files.length} Markdown files; all local link targets exist.\n`)
}
