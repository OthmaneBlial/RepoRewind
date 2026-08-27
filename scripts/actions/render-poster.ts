import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, type Download, type Page } from 'playwright'
import { analyzeRepositoryStreaming } from '../../cli/git-reader'
import { startViewerServer } from '../../cli/viewer-server'
import type { RepositoryHistory } from '../../src/core/types'

export const ACTION_FILENAMES = {
  checksums: 'SHA256SUMS',
  manifest: 'action-manifest.json',
  poster: 'repo-rewind-evidence-poster.png',
  privacy: 'reporewind-evidence-privacy-report.json',
} as const

interface ActionFileRecord {
  bytes: number
  filename: string
  sha256: string
}

export interface ActionManifest {
  schemaVersion: 1
  generator: {
    name: 'RepoRewind evidence poster Action'
    deterministicRenderCheck: 'passed'
  }
  source: {
    commitCount: number
    completeHistory: boolean
    selectedRange: string
  }
  privacy: {
    archiveContainsEmails: boolean
    preset: 'public'
    repositoryVisibility: 'public' | 'private' | 'internal' | 'unknown'
  }
  publication: {
    mode: 'private-actions-artifact-only'
    published: false
    retentionDays: number
  }
  files: ActionFileRecord[]
}

function positiveInteger(value: string | undefined, name: string, maximum: number): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${name} must be a positive integer no greater than ${maximum}.`)
  }
  return parsed
}

function sha256(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex')
}

function repositoryVisibility(value: string | undefined): ActionManifest['privacy']['repositoryVisibility'] {
  return value === 'public' || value === 'private' || value === 'internal' ? value : 'unknown'
}

export function buildActionManifest(
  history: RepositoryHistory,
  files: ActionFileRecord[],
  retentionDays: number,
  visibility: string | undefined,
): ActionManifest {
  return {
    schemaVersion: 1,
    generator: {
      name: 'RepoRewind evidence poster Action',
      deterministicRenderCheck: 'passed',
    },
    source: {
      commitCount: history.commits.length,
      completeHistory: !history.repository.truncated,
      selectedRange: history.repository.truncated ? 'bounded first-parent history' : 'complete first-parent history',
    },
    privacy: {
      archiveContainsEmails: history.contributors.some((contributor) => Boolean(contributor.email)),
      preset: 'public',
      repositoryVisibility: repositoryVisibility(visibility),
    },
    publication: {
      mode: 'private-actions-artifact-only',
      published: false,
      retentionDays,
    },
    files,
  }
}

async function waitForDownloads(downloads: Download[], expectedCount: number): Promise<void> {
  const deadline = Date.now() + 30_000
  while (downloads.length < expectedCount && Date.now() < deadline) await delay(50)
  if (downloads.length < expectedCount) throw new Error('The evidence poster downloads did not complete.')
}

async function renderPosterPair(page: Page, temporaryRoot: string): Promise<{ poster: Buffer; privacy: Buffer }> {
  const downloads: Download[] = []
  page.on('download', (download) => downloads.push(download))
  const renderButton = page.getByRole('button', { name: /Export evidence poster/ })
  const renders: Array<{ poster: Buffer; privacy: Buffer }> = []

  for (let run = 0; run < 2; run += 1) {
    const previousCount = downloads.length
    await renderButton.click()
    await waitForDownloads(downloads, previousCount + 2)
    const current = downloads.slice(previousCount, previousCount + 2)
    const posterDownload = current.find((download) => download.suggestedFilename() === ACTION_FILENAMES.poster)
    const privacyDownload = current.find((download) => download.suggestedFilename() === ACTION_FILENAMES.privacy)
    if (!posterDownload || !privacyDownload) throw new Error('The evidence export returned unexpected filenames.')
    const posterPath = resolve(temporaryRoot, `poster-${run}.png`)
    const privacyPath = resolve(temporaryRoot, `privacy-${run}.json`)
    await Promise.all([posterDownload.saveAs(posterPath), privacyDownload.saveAs(privacyPath)])
    renders.push({ poster: readFileSync(posterPath), privacy: readFileSync(privacyPath) })
    await renderButton.waitFor({ state: 'visible' })
  }

  if (!renders[0].poster.equals(renders[1].poster)) {
    throw new Error('Repeated poster renders were not byte-for-byte deterministic on this supported runner.')
  }
  return renders[0]
}

function assertOutputTargetsAreNew(outputDirectory: string): void {
  for (const filename of Object.values(ACTION_FILENAMES)) {
    if (existsSync(resolve(outputDirectory, filename))) {
      throw new Error(`Refusing to replace existing action output: ${filename}`)
    }
  }
}

async function main(): Promise<void> {
  const actionRoot = fileURLToPath(new URL('../..', import.meta.url))
  const repository = resolve(process.env.REPOREWIND_ACTION_REPOSITORY ?? process.cwd())
  const outputDirectory = resolve(process.env.REPOREWIND_ACTION_OUTPUT_DIR ?? 'reporewind-action-output')
  const maxCommits = positiveInteger(process.env.REPOREWIND_ACTION_MAX_COMMITS ?? '5000', 'max-commits', 250_000)
  const retentionDays = positiveInteger(process.env.REPOREWIND_ACTION_RETENTION_DAYS ?? '3', 'retention-days', 30)
  const branch = process.env.REPOREWIND_ACTION_REF?.trim() || undefined
  const history = await analyzeRepositoryStreaming(repository, { branch, maxCommits })
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'reporewind-action-'))
  const browser = await chromium.launch({ headless: true, args: ['--disable-webgl', '--disable-gpu'] })
  const context = await browser.newContext({ acceptDownloads: true, reducedMotion: 'reduce' })
  const session = await startViewerServer({ history, webRoot: resolve(actionRoot, 'dist') })
  let pageError: string | undefined
  try {
    const page = await context.newPage()
    page.on('pageerror', (error) => {
      pageError ??= error.message
    })
    await page.goto(session.url, { waitUntil: 'domcontentloaded' })
    await page.getByRole('region', { name: 'Repository evidence view' }).waitFor({ state: 'visible', timeout: 120_000 })
    const rendered = await renderPosterPair(page, temporaryRoot)
    if (pageError) throw new Error(`The renderer emitted an uncaught page error: ${pageError}`)

    mkdirSync(outputDirectory, { recursive: true })
    assertOutputTargetsAreNew(outputDirectory)
    writeFileSync(resolve(outputDirectory, ACTION_FILENAMES.poster), rendered.poster, { flag: 'wx' })
    writeFileSync(resolve(outputDirectory, ACTION_FILENAMES.privacy), rendered.privacy, { flag: 'wx' })
    const files: ActionFileRecord[] = [
      {
        filename: ACTION_FILENAMES.poster,
        bytes: rendered.poster.length,
        sha256: sha256(rendered.poster),
      },
      {
        filename: ACTION_FILENAMES.privacy,
        bytes: rendered.privacy.length,
        sha256: sha256(rendered.privacy),
      },
    ]
    const manifest = buildActionManifest(
      history,
      files,
      retentionDays,
      process.env.REPOREWIND_ACTION_REPOSITORY_VISIBILITY,
    )
    writeFileSync(resolve(outputDirectory, ACTION_FILENAMES.manifest), `${JSON.stringify(manifest, null, 2)}\n`, {
      flag: 'wx',
    })
    const checksumLines = files.map((file) => `${file.sha256}  ${file.filename}`)
    const manifestContents = readFileSync(resolve(outputDirectory, ACTION_FILENAMES.manifest))
    checksumLines.push(`${sha256(manifestContents)}  ${ACTION_FILENAMES.manifest}`)
    writeFileSync(resolve(outputDirectory, ACTION_FILENAMES.checksums), `${checksumLines.join('\n')}\n`, { flag: 'wx' })
    process.stdout.write(
      `Generated ${basename(outputDirectory)}/${ACTION_FILENAMES.poster} with a repeated-render SHA-256 check.\n`,
    )
  } finally {
    await context.close()
    await browser.close()
    await session.close()
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
