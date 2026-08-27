import packageMetadata from '../../package.json'
import {
  buildPrivacyReport,
  displayDate,
  displayRef,
  privacyReportJson,
  type SharePrivacySettings,
} from '../core/privacy'
import type { HistorySnapshot, RepositoryHistory } from '../core/types'
import { buildTimelapseOverlayCopy, type TimelapseFormat } from './timelapse'

export const STORY_PACK_FILENAMES = {
  socialCard: 'repo-rewind-social-card.png',
  squarePoster: 'repo-rewind-square-poster.png',
  widescreenPoster: 'repo-rewind-widescreen-poster.png',
  currentFrame: 'repo-rewind-current-frame.png',
  markdown: 'README-snippet.md',
  manifest: 'manifest.json',
  privacyReport: 'privacy-report.json',
  archive: 'repo-rewind-story-pack.zip',
} as const

export const STORY_PACK_DIMENSIONS = {
  socialCard: { width: 1200, height: 630 },
  squarePoster: { width: 1080, height: 1080 },
  widescreenPoster: { width: 1920, height: 1080 },
  currentFrame: { width: 1600, height: 900 },
} as const

interface StoryPackArtifact {
  filename: string
  mediaType: string
  bytes: Uint8Array
  width?: number
  height?: number
}

export interface StoryPackArtifactRecord {
  filename: string
  mediaType: string
  bytes: number
  sha256: string
  width?: number
  height?: number
}

export interface StoryPackManifest {
  packVersion: 1
  repoRewindVersion: string
  schemaVersion: number
  preset: SharePrivacySettings['preset']
  selection: {
    ref: string
    scope: 'branch' | 'all-branches'
    range: { from: string; to: string }
    frame: number
    historyCompleteness: 'complete' | 'partial'
  }
  includedFields: string[]
  omittedFields: string[]
  links: { project: string; liveDemo: string }
  artifacts: StoryPackArtifactRecord[]
}

export interface StoryPackResult {
  blob: Blob
  filename: typeof STORY_PACK_FILENAMES.archive
  manifest: StoryPackManifest
}

export interface BuildStoryPackOptions {
  history: RepositoryHistory
  snapshot: HistorySnapshot
  privacy: SharePrivacySettings
  sourceCanvas: HTMLCanvasElement
  trailer: Blob
  trailerFormat: TimelapseFormat
  signal?: AbortSignal
  projectUrl?: string
  liveDemoUrl?: string
}

const DEFAULT_PROJECT_URL = 'https://github.com/OthmaneBlial/RepoRewind'
const DEFAULT_LIVE_URL = 'https://othmaneblial.github.io/RepoRewind/play/'

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Export canceled.', 'AbortError')
}

function fitCover(sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = width / height
  if (sourceRatio > targetRatio) {
    const drawHeight = height
    const drawWidth = drawHeight * sourceRatio
    return { x: (width - drawWidth) / 2, y: 0, width: drawWidth, height: drawHeight }
  }
  const drawWidth = width
  const drawHeight = drawWidth / sourceRatio
  return { x: 0, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight }
}

function drawPoster(
  sourceCanvas: HTMLCanvasElement,
  history: RepositoryHistory,
  snapshot: HistorySnapshot,
  privacy: SharePrivacySettings,
  dimensions: { width: number; height: number },
  variant: 'social' | 'square' | 'widescreen' | 'frame',
): HTMLCanvasElement {
  if (sourceCanvas.width < 1 || sourceCanvas.height < 1) {
    throw new Error('The city renderer is not ready for a story pack.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('The poster renderer could not be created.')

  const fitted = fitCover(sourceCanvas.width, sourceCanvas.height, canvas.width, canvas.height)
  context.fillStyle = '#070907'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(sourceCanvas, fitted.x, fitted.y, fitted.width, fitted.height)

  const copy = buildTimelapseOverlayCopy(history, snapshot, privacy)
  const scale = canvas.width / 1200
  const margin = Math.round(58 * scale)
  const footerHeight = Math.round((variant === 'square' ? 360 : variant === 'frame' ? 186 : 230) * scale)
  const topShade = context.createLinearGradient(0, 0, 0, canvas.height * 0.4)
  topShade.addColorStop(0, 'rgba(3, 7, 5, .72)')
  topShade.addColorStop(1, 'rgba(3, 7, 5, 0)')
  context.fillStyle = topShade
  context.fillRect(0, 0, canvas.width, canvas.height * 0.5)
  const footerShade = context.createLinearGradient(0, canvas.height - footerHeight * 1.8, 0, canvas.height)
  footerShade.addColorStop(0, 'rgba(3, 7, 5, 0)')
  footerShade.addColorStop(1, 'rgba(3, 7, 5, .96)')
  context.fillStyle = footerShade
  context.fillRect(0, canvas.height - footerHeight * 1.8, canvas.width, footerHeight * 1.8)

  context.textBaseline = 'alphabetic'
  context.fillStyle = '#ffb866'
  context.font = `700 ${Math.round(15 * scale)}px ui-monospace, monospace`
  context.letterSpacing = `${Math.max(1, Math.round(2 * scale))}px`
  context.fillText('A VISUAL GIT HISTORY', margin, margin)

  const titleSize = Math.round((variant === 'square' ? 62 : 55) * scale)
  context.fillStyle = '#f4ead7'
  context.font = `600 ${titleSize}px Georgia, serif`
  const titleY = canvas.height - footerHeight + titleSize
  context.fillText(copy.repository, margin, titleY, canvas.width - margin * 2)

  context.fillStyle = '#d8d1c4'
  context.font = `500 ${Math.round(16 * scale)}px ui-monospace, monospace`
  const commit = copy.commit.length > 82 ? `${copy.commit.slice(0, 80)}…` : copy.commit
  context.fillText(commit, margin, titleY + Math.round(38 * scale), canvas.width - margin * 2)

  context.fillStyle = '#91a099'
  context.font = `600 ${Math.round(13 * scale)}px ui-monospace, monospace`
  context.fillText(
    `${copy.date}   ·   ${copy.statistics}`,
    margin,
    titleY + Math.round(72 * scale),
    canvas.width - margin * 2,
  )

  if (privacy.attribution) {
    context.textAlign = 'right'
    context.fillStyle = '#ffbd76'
    context.font = `600 ${Math.round(11 * scale)}px ui-monospace, monospace`
    context.fillText('MADE WITH REPOREWIND', canvas.width - margin, margin)
    context.textAlign = 'left'
  }

  return canvas
}

async function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('The PNG encoder returned no image.'))),
      'image/png',
    )
  })
  return new Uint8Array(await blob.arrayBuffer())
}

async function sha256(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 needs a secure browser context.')
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function storyPackAltText(history: RepositoryHistory, privacy: SharePrivacySettings): string {
  const repository = privacy.repositoryName ? history.repository.name : 'a repository'
  const range = `${displayDate(history.repository.firstCommitAt, privacy)} to ${displayDate(
    history.repository.lastCommitAt,
    privacy,
  )}`
  const counts = privacy.aggregates ? ` across ${history.commits.length.toLocaleString('en')} commits` : ''
  return `RepoRewind visual Git history of ${repository}, from ${range}${counts}, shown as a cinematic software city.`
}

export function buildStoryPackMarkdown(
  history: RepositoryHistory,
  privacy: SharePrivacySettings,
  trailerFormat: TimelapseFormat,
  projectUrl = DEFAULT_PROJECT_URL,
  liveDemoUrl = DEFAULT_LIVE_URL,
): string {
  const alt = storyPackAltText(history, privacy).replaceAll('"', '&quot;')
  const attribution = privacy.attribution
    ? `\n_Made locally with [RepoRewind](${projectUrl}); repository data was not uploaded._\n`
    : ''
  return `<a href="${liveDemoUrl}"><img src="./${STORY_PACK_FILENAMES.socialCard}" alt="${alt}" width="1200"></a>\n\n[Watch the RepoRewind trailer](./repo-rewind-trailer.${trailerFormat}) · [Explore the live demo](${liveDemoUrl})\n${attribution}`
}

export async function buildStoryPackManifest(
  history: RepositoryHistory,
  snapshot: HistorySnapshot,
  privacy: SharePrivacySettings,
  artifacts: StoryPackArtifact[],
  projectUrl = DEFAULT_PROJECT_URL,
  liveDemoUrl = DEFAULT_LIVE_URL,
): Promise<StoryPackManifest> {
  const report = buildPrivacyReport(history, privacy)
  const records = await Promise.all(
    artifacts.map(async (artifact) => ({
      filename: artifact.filename,
      mediaType: artifact.mediaType,
      bytes: artifact.bytes.byteLength,
      sha256: await sha256(artifact.bytes),
      ...(artifact.width ? { width: artifact.width } : {}),
      ...(artifact.height ? { height: artifact.height } : {}),
    })),
  )
  return {
    packVersion: 1,
    repoRewindVersion: packageMetadata.version,
    schemaVersion: history.schemaVersion,
    preset: privacy.preset,
    selection: {
      ref: displayRef(history.repository.branch, 0, privacy),
      scope: history.repository.scope ?? 'branch',
      range: {
        from: displayDate(history.repository.firstCommitAt, privacy),
        to: displayDate(history.repository.lastCommitAt, privacy),
      },
      frame: snapshot.index + 1,
      historyCompleteness: history.repository.truncated ? 'partial' : 'complete',
    },
    includedFields: report.includedFields,
    omittedFields: report.omittedFields,
    links: { project: projectUrl, liveDemo: liveDemoUrl },
    artifacts: records,
  }
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zipHeader(length: number, write: (view: DataView) => void): Uint8Array {
  const bytes = new Uint8Array(length)
  write(new DataView(bytes.buffer))
  return bytes
}

function blobBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer
  }
  return bytes.slice().buffer as ArrayBuffer
}

export function createStoredZip(files: Array<{ filename: string; bytes: Uint8Array }>): Blob {
  const encoder = new TextEncoder()
  const parts: ArrayBuffer[] = []
  const centralParts: ArrayBuffer[] = []
  let offset = 0

  for (const file of files) {
    if (!/^[A-Za-z0-9._-]+$/.test(file.filename)) throw new Error(`Unsafe story-pack filename: ${file.filename}`)
    if (file.bytes.byteLength > 0xffffffff) throw new Error(`${file.filename} is too large for the story pack.`)
    const name = encoder.encode(file.filename)
    const checksum = crc32(file.bytes)
    const local = zipHeader(30, (view) => {
      view.setUint32(0, 0x04034b50, true)
      view.setUint16(4, 20, true)
      view.setUint16(6, 0x0800, true)
      view.setUint16(8, 0, true)
      view.setUint16(10, 0, true)
      view.setUint16(12, 0x0021, true)
      view.setUint32(14, checksum, true)
      view.setUint32(18, file.bytes.byteLength, true)
      view.setUint32(22, file.bytes.byteLength, true)
      view.setUint16(26, name.byteLength, true)
      view.setUint16(28, 0, true)
    })
    const central = zipHeader(46, (view) => {
      view.setUint32(0, 0x02014b50, true)
      view.setUint16(4, 20, true)
      view.setUint16(6, 20, true)
      view.setUint16(8, 0x0800, true)
      view.setUint16(10, 0, true)
      view.setUint16(12, 0, true)
      view.setUint16(14, 0x0021, true)
      view.setUint32(16, checksum, true)
      view.setUint32(20, file.bytes.byteLength, true)
      view.setUint32(24, file.bytes.byteLength, true)
      view.setUint16(28, name.byteLength, true)
      view.setUint16(30, 0, true)
      view.setUint16(32, 0, true)
      view.setUint16(34, 0, true)
      view.setUint16(36, 0, true)
      view.setUint32(38, 0, true)
      view.setUint32(42, offset, true)
    })
    parts.push(blobBuffer(local), blobBuffer(name), blobBuffer(file.bytes))
    centralParts.push(blobBuffer(central), blobBuffer(name))
    offset += local.byteLength + name.byteLength + file.bytes.byteLength
  }

  const centralOffset = offset
  const centralSize = centralParts.reduce((total, part) => total + part.byteLength, 0)
  if (offset + centralSize > 0xffffffff || files.length > 0xffff) throw new Error('The story pack exceeds ZIP limits.')
  const end = zipHeader(22, (view) => {
    view.setUint32(0, 0x06054b50, true)
    view.setUint16(4, 0, true)
    view.setUint16(6, 0, true)
    view.setUint16(8, files.length, true)
    view.setUint16(10, files.length, true)
    view.setUint32(12, centralSize, true)
    view.setUint32(16, centralOffset, true)
    view.setUint16(20, 0, true)
  })
  return new Blob([...parts, ...centralParts, blobBuffer(end)], { type: 'application/zip' })
}

export function cloneCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  if (sourceCanvas.width < 1 || sourceCanvas.height < 1) throw new Error('The city renderer is not ready.')
  const copy = document.createElement('canvas')
  copy.width = sourceCanvas.width
  copy.height = sourceCanvas.height
  const context = copy.getContext('2d', { alpha: false })
  if (!context) throw new Error('The current frame could not be captured.')
  context.drawImage(sourceCanvas, 0, 0)
  return copy
}

export async function buildStoryPack(options: BuildStoryPackOptions): Promise<StoryPackResult> {
  ensureNotAborted(options.signal)
  const posterSpecs = [
    { filename: STORY_PACK_FILENAMES.socialCard, dimensions: STORY_PACK_DIMENSIONS.socialCard, variant: 'social' },
    { filename: STORY_PACK_FILENAMES.squarePoster, dimensions: STORY_PACK_DIMENSIONS.squarePoster, variant: 'square' },
    {
      filename: STORY_PACK_FILENAMES.widescreenPoster,
      dimensions: STORY_PACK_DIMENSIONS.widescreenPoster,
      variant: 'widescreen',
    },
    { filename: STORY_PACK_FILENAMES.currentFrame, dimensions: STORY_PACK_DIMENSIONS.currentFrame, variant: 'frame' },
  ] as const
  const posters: StoryPackArtifact[] = []
  for (const spec of posterSpecs) {
    ensureNotAborted(options.signal)
    posters.push({
      filename: spec.filename,
      mediaType: 'image/png',
      bytes: await canvasPng(
        drawPoster(
          options.sourceCanvas,
          options.history,
          options.snapshot,
          options.privacy,
          spec.dimensions,
          spec.variant,
        ),
      ),
      ...spec.dimensions,
    })
  }

  const projectUrl = options.projectUrl ?? DEFAULT_PROJECT_URL
  const liveDemoUrl = options.liveDemoUrl ?? DEFAULT_LIVE_URL
  const encoder = new TextEncoder()
  const trailerFilename = `repo-rewind-trailer.${options.trailerFormat}`
  const artifacts: StoryPackArtifact[] = [
    ...posters,
    {
      filename: trailerFilename,
      mediaType: options.trailer.type || `video/${options.trailerFormat}`,
      bytes: new Uint8Array(await options.trailer.arrayBuffer()),
    },
    {
      filename: STORY_PACK_FILENAMES.markdown,
      mediaType: 'text/markdown',
      bytes: encoder.encode(
        buildStoryPackMarkdown(options.history, options.privacy, options.trailerFormat, projectUrl, liveDemoUrl),
      ),
    },
    {
      filename: STORY_PACK_FILENAMES.privacyReport,
      mediaType: 'application/json',
      bytes: encoder.encode(privacyReportJson(options.history, options.privacy)),
    },
  ]
  ensureNotAborted(options.signal)
  const manifest = await buildStoryPackManifest(
    options.history,
    options.snapshot,
    options.privacy,
    artifacts,
    projectUrl,
    liveDemoUrl,
  )
  const manifestBytes = encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`)
  const blob = createStoredZip([
    ...artifacts.map(({ filename, bytes }) => ({ filename, bytes })),
    { filename: STORY_PACK_FILENAMES.manifest, bytes: manifestBytes },
  ])
  ensureNotAborted(options.signal)
  return { blob, filename: STORY_PACK_FILENAMES.archive, manifest }
}
