import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const siteRoot = resolve(root, 'site')
const galleryRoot = resolve(siteRoot, 'assets/gallery')
const manifest = JSON.parse(await readFile(resolve(siteRoot, 'gallery/entries.json'), 'utf8'))
const failures = []

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex')
const assetPath = (relativePath) => resolve(siteRoot, relativePath)

if (manifest.schemaVersion !== 1 || manifest.entries?.length !== 3) {
  failures.push('Gallery manifest must contain exactly three schema-v1 launch entries.')
}
if (!/^[a-f0-9]{40}$/.test(manifest.generator?.commit ?? '')) {
  failures.push('Gallery generator must be pinned to a full commit SHA.')
}

const ids = new Set()
const repositories = new Set()
for (const entry of manifest.entries ?? []) {
  if (ids.has(entry.id)) failures.push(`${entry.id}: duplicate gallery id.`)
  if (repositories.has(entry.repository?.url)) failures.push(`${entry.id}: duplicate source repository.`)
  ids.add(entry.id)
  repositories.add(entry.repository?.url)

  if (!/^https:\/\/github\.com\/OthmaneBlial\/[A-Za-z0-9_.-]+$/.test(entry.repository?.url ?? '')) {
    failures.push(`${entry.id}: source repository is not an approved public GitHub URL.`)
  }
  if (!/^[a-f0-9]{40}$/.test(entry.repository?.headSha ?? '')) {
    failures.push(`${entry.id}: source head is not immutable.`)
  }
  if (entry.repository?.license !== 'MIT' || !entry.repository?.permission?.includes('owner-controlled public')) {
    failures.push(`${entry.id}: permission and license provenance are incomplete.`)
  }
  if (
    entry.analysis?.range !== 'complete first-parent history' ||
    entry.analysis?.truncated !== false ||
    !Number.isSafeInteger(entry.analysis?.commits) ||
    entry.analysis.commits <= 0
  ) {
    failures.push(`${entry.id}: analyzed range evidence is incomplete.`)
  }
  if (
    !entry.analysis?.exactCommand?.includes(manifest.generator.commit) ||
    !entry.analysis?.exactCommand?.includes('--max-commits 5000') ||
    !entry.analysis?.exactCommand?.includes(`--branch ${entry.repository.defaultBranch}`)
  ) {
    failures.push(`${entry.id}: replay command is not pinned and bounded.`)
  }
  if (!entry.finding || !entry.interpretationLimit || !entry.provenance) {
    failures.push(`${entry.id}: editorial finding, limit, or provenance is missing.`)
  }

  const poster = await readFile(assetPath(entry.poster.path))
  const privacy = await readFile(assetPath(entry.privacy.path))
  const posterStats = await stat(assetPath(entry.poster.path))
  const privacyStats = await stat(assetPath(entry.privacy.path))
  if (poster.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') failures.push(`${entry.id}: poster is not PNG.`)
  if (poster.readUInt32BE(16) !== 1200 || poster.readUInt32BE(20) !== 630) {
    failures.push(`${entry.id}: poster is not 1200×630.`)
  }
  if (
    sha256(poster) !== entry.poster.sha256 ||
    posterStats.size !== entry.poster.bytes ||
    sha256(privacy) !== entry.privacy.sha256 ||
    privacyStats.size !== entry.privacy.bytes
  ) {
    failures.push(`${entry.id}: asset size or checksum drifted.`)
  }

  const privacyReport = JSON.parse(privacy)
  const disclosure = privacyReport.disclosure ?? {}
  if (
    privacyReport.preset !== 'public' ||
    disclosure.repositoryName !== false ||
    disclosure.contributorNames !== false ||
    disclosure.commitMessages !== false ||
    disclosure.commitHashes !== false ||
    disclosure.pathDisclosure !== 'hidden' ||
    disclosure.refNames !== false ||
    disclosure.includeEmails !== false
  ) {
    failures.push(`${entry.id}: privacy report is not the fixed public projection.`)
  }
}

const galleryFiles = (await readdir(galleryRoot)).sort()
const expectedFiles = (manifest.entries ?? [])
  .flatMap((entry) => [entry.poster.path.split('/').at(-1), entry.privacy.path.split('/').at(-1)])
  .sort()
if (JSON.stringify(galleryFiles) !== JSON.stringify(expectedFiles)) {
  failures.push('Gallery assets contain an untracked file or retained archive.')
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(
    'Checked 3 permissioned gallery stories, public privacy reports, PNG dimensions, and checksums.\n',
  )
}
