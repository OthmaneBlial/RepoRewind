import { access, readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const pagesRoot = join(projectRoot, '.pages-site')
const failures = []

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const target = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await filesBelow(target)))
    else if (entry.isFile()) files.push(target)
  }
  return files
}

function documentTargets(html) {
  return Array.from(html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g), (match) => match[1])
}

function isExternal(target) {
  return target.startsWith('#') || target.startsWith('data:') || /^[a-z][a-z\d+.-]*:/i.test(target)
}

async function checkDocument(file) {
  const html = await readFile(file, 'utf8')
  for (const rawTarget of documentTargets(html)) {
    if (isExternal(rawTarget)) continue
    if (rawTarget.startsWith('/')) {
      failures.push(`${relative(pagesRoot, file)}: root-relative target breaks project Pages: ${rawTarget}`)
      continue
    }
    const cleanTarget = decodeURIComponent(rawTarget.split('#')[0].split('?')[0])
    if (!cleanTarget) continue
    const target = resolve(dirname(file), cleanTarget)
    if (relative(pagesRoot, target).startsWith('..')) {
      failures.push(`${relative(pagesRoot, file)}: target escapes the Pages bundle: ${rawTarget}`)
      continue
    }
    try {
      await access(target)
    } catch {
      failures.push(`${relative(pagesRoot, file)}: missing target: ${rawTarget}`)
    }
  }
  return html
}

const files = await filesBelow(pagesRoot)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
const documents = new Map()
for (const file of htmlFiles) documents.set(file, await checkDocument(file))

const landing = documents.get(join(pagesRoot, 'index.html')) ?? ''
const gallery = documents.get(join(pagesRoot, 'gallery.html')) ?? ''
const playground = documents.get(join(pagesRoot, 'play', 'index.html')) ?? ''
if (!landing.includes('href="./play/?case=rebuild"')) {
  failures.push('index.html: missing canonical guided rebuild link')
}
if (!landing.includes('href="./gallery.html"')) failures.push('index.html: missing canonical gallery link')
if (!landing.includes('npx reporewind .')) failures.push('index.html: missing public npm run path')
if (landing.includes('public npm package pending')) failures.push('index.html: still presents npm as pending')
for (const storyId of ['reporewind-productization', 'lightclaw-module-extraction', 'pdf-editor-offline-rename']) {
  if (!gallery.includes(`id="${storyId}"`)) failures.push(`gallery.html: missing reviewed story ${storyId}`)
}
if (!gallery.includes('href="./gallery/entries.json"')) {
  failures.push('gallery.html: missing machine-readable provenance link')
}
if (!playground.includes('http-equiv="Content-Security-Policy"')) {
  failures.push('play/index.html: missing Content-Security-Policy meta policy')
}
if (!playground.includes('id="root"')) failures.push('play/index.html: missing application root')

const sourceMaps = files.filter((file) => file.endsWith('.map'))
if (sourceMaps.length > 0)
  failures.push(`Pages bundle contains source maps: ${sourceMaps.map((file) => relative(pagesRoot, file)).join(', ')}`)

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Checked ${htmlFiles.length} Pages documents and ${files.length} bundled files.\n`)
}
