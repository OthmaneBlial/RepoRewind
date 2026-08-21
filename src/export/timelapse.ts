import type { HistorySnapshot, RepositoryHistory } from '../core/types'

export interface ExportOptions {
  format: TimelapseFormat
  duration: number
  fps: number
  width: number
  height: number
  pacing: 'activity' | 'chronological'
  onProgress: (progress: number) => void
  setFrame: (index: number) => void
  getSourceCanvas: () => HTMLCanvasElement | null
  history: RepositoryHistory
  snapshotCount: number
  getSnapshot: (index: number) => HistorySnapshot
}

export type TimelapseFormat = 'mp4' | 'webm'

export interface Mp4ExportSupport {
  supported: boolean
  reason?: string
}

export interface TimelapseFrame {
  frame: number
  progress: number
  snapshotIndex: number
  timestamp: number
  duration: number
}

const waitForFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

function fitCover(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight
  if (sourceRatio > targetRatio) {
    const height = targetHeight
    const width = height * sourceRatio
    return { x: (targetWidth - width) / 2, y: 0, width, height }
  }
  const width = targetWidth
  const height = width / sourceRatio
  return { x: 0, y: (targetHeight - height) / 2, width, height }
}

function drawTitle(ctx: CanvasRenderingContext2D, width: number, height: number, history: RepositoryHistory, snapshot: HistorySnapshot, progress: number) {
  const fade = Math.min(1, progress * 10, (1 - progress) * 10)
  const bottomGradient = ctx.createLinearGradient(0, height * 0.58, 0, height)
  bottomGradient.addColorStop(0, 'rgba(5, 8, 7, 0)')
  bottomGradient.addColorStop(1, 'rgba(5, 8, 7, 0.92)')
  ctx.fillStyle = bottomGradient
  ctx.fillRect(0, 0, width, height)

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.46, height * 0.18, width * 0.5, height * 0.48, width * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,.42)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = fade

  const margin = width * 0.055
  ctx.fillStyle = '#f3e8d0'
  ctx.font = `600 ${Math.round(width * 0.034)}px Georgia, serif`
  ctx.fillText(history.repository.name, margin, height - height * 0.14)
  ctx.fillStyle = '#ffbe6f'
  ctx.font = `600 ${Math.round(width * 0.011)}px ui-monospace, monospace`
  ctx.letterSpacing = `${Math.round(width * 0.002)}px`
  const date = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(snapshot.date)).toUpperCase()
  ctx.fillText(date, margin, height - height * 0.2)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#d6d0c3'
  ctx.font = `400 ${Math.round(width * 0.013)}px ui-monospace, monospace`
  const shortMessage = snapshot.commit.message.length > 68 ? `${snapshot.commit.message.slice(0, 66)}…` : snapshot.commit.message
  ctx.fillText(shortMessage, width - margin, height - height * 0.14)
  ctx.fillStyle = '#8fa198'
  ctx.font = `500 ${Math.round(width * 0.009)}px ui-monospace, monospace`
  ctx.fillText(`${snapshot.activeFiles.toLocaleString()} FILES   ${snapshot.totalLines.toLocaleString()} LINES   ${history.contributors.length} TRAVELERS`, width - margin, height - height * 0.095)

  const lineY = height - height * 0.052
  ctx.fillStyle = 'rgba(255,255,255,.16)'
  ctx.fillRect(margin, lineY, width - margin * 2, 2)
  ctx.fillStyle = '#ffb45c'
  ctx.fillRect(margin, lineY, (width - margin * 2) * progress, 3)

  if (snapshot.isRelease || snapshot.isMerge || snapshot.isRefactor) {
    ctx.textAlign = 'right'
    ctx.fillStyle = snapshot.isRelease ? '#ffbe6f' : snapshot.isMerge ? '#9ebdff' : '#80d8c3'
    ctx.font = `600 ${Math.round(width * 0.009)}px ui-monospace, monospace`
    const eventName = snapshot.release?.tag
      ? `RELEASE  ${snapshot.release.tag}`
      : snapshot.isMerge
        ? `CONFLUENCE  ${snapshot.commit.parents.length} HISTORIES`
        : 'NEIGHBORHOOD REBUILT'
    ctx.fillText(eventName, width - margin, height * 0.085)
  }

  if (progress < 0.085) {
    const introAlpha = Math.max(0, 1 - progress / 0.085)
    ctx.globalAlpha = introAlpha * 0.92
    ctx.fillStyle = '#070a08'
    ctx.fillRect(0, 0, width, height)
    ctx.globalAlpha = introAlpha
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffb45c'
    ctx.font = `600 ${Math.round(width * 0.009)}px ui-monospace, monospace`
    ctx.fillText('A VISUAL HISTORY', width / 2, height * 0.43)
    ctx.fillStyle = '#f1e7d3'
    ctx.font = `500 ${Math.round(width * 0.052)}px Georgia, serif`
    ctx.fillText(history.repository.name, width / 2, height * 0.52)
    ctx.fillStyle = '#839087'
    ctx.font = `500 ${Math.round(width * 0.01)}px ui-monospace, monospace`
    const firstYear = new Date(history.repository.firstCommitAt).getUTCFullYear()
    const lastYear = new Date(history.repository.lastCommitAt).getUTCFullYear()
    ctx.fillText(`${firstYear} — ${lastYear}   ·   ${history.commits.length.toLocaleString()} COMMITS`, width / 2, height * 0.59)
  }

  if (progress > 0.965) {
    const creditAlpha = Math.min(1, (progress - 0.965) / 0.035)
    ctx.globalAlpha = creditAlpha
    ctx.textAlign = 'center'
    ctx.fillStyle = '#9aa49e'
    ctx.font = `600 ${Math.round(width * 0.008)}px ui-monospace, monospace`
    ctx.fillText('ARCHIVED WITH REPOREWIND', width / 2, height * 0.93)
  }
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1
}

export function buildTimelapseFramePlan(
  history: RepositoryHistory,
  snapshotCount: number,
  duration: number,
  fps: number,
  pacing: ExportOptions['pacing'],
): TimelapseFrame[] {
  if (snapshotCount < 1) throw new Error('The archive does not contain any frames.')
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(fps) || fps <= 0) {
    throw new Error('The film duration and frame rate must be positive.')
  }

  const commitTimes: number[] = []
  history.commits.forEach((commit, index) => {
    const parsed = new Date(commit.authoredAt).getTime()
    commitTimes.push(Math.max(index > 0 ? commitTimes[index - 1] : Number.NEGATIVE_INFINITY, Number.isFinite(parsed) ? parsed : 0))
  })
  const firstTime = commitTimes[0] ?? 0
  const lastTime = commitTimes.at(-1) ?? firstTime
  const snapshotIndexForProgress = (progress: number) => {
    if (pacing === 'activity' || lastTime <= firstTime) {
      return Math.min(snapshotCount - 1, Math.floor(progress * snapshotCount))
    }
    const target = firstTime + (lastTime - firstTime) * progress
    let low = 0
    let high = commitTimes.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (commitTimes[middle] <= target) low = middle
      else high = middle - 1
    }
    return Math.min(snapshotCount - 1, low)
  }

  const totalFrames = Math.max(2, Math.round(duration * fps))
  return Array.from({ length: totalFrames }, (_, frame) => ({
    frame,
    progress: frame / (totalFrames - 1),
    snapshotIndex: snapshotIndexForProgress(frame / (totalFrames - 1)),
    timestamp: frame / fps,
    duration: 1 / fps,
  }))
}

function createComposite(options: ExportOptions) {
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('The export canvas could not be created.')
  return { canvas, context }
}

async function renderCompositeFrame(
  options: ExportOptions,
  context: CanvasRenderingContext2D,
  frame: TimelapseFrame,
) {
  options.onProgress(frame.progress)
  options.setFrame(frame.snapshotIndex)
  await waitForFrame()
  const source = options.getSourceCanvas()
  if (!source) throw new Error('The city renderer is not ready.')
  context.fillStyle = '#080a09'
  context.fillRect(0, 0, options.width, options.height)
  const fitted = fitCover(source.width, source.height, options.width, options.height)
  context.drawImage(source, fitted.x, fitted.y, fitted.width, fitted.height)
  drawTitle(context, options.width, options.height, options.history, options.getSnapshot(frame.snapshotIndex), frame.progress)
}

function exportBitrate(width: number) {
  return width >= 3000 ? 32_000_000 : 16_000_000
}

export async function probeMp4Export(width: number, height: number): Promise<Mp4ExportSupport> {
  if (!globalThis.isSecureContext) return { supported: false, reason: 'MP4 needs a secure browser context (HTTPS or localhost).' }
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return { supported: false, reason: 'This browser does not expose WebCodecs video encoding.' }
  }
  try {
    const { Mp4OutputFormat, Quality, canEncodeVideo } = await import('mediabunny')
    if (!new Mp4OutputFormat().getSupportedVideoCodecs().includes('avc')) {
      return { supported: false, reason: 'This browser cannot place H.264 video in an MP4 file.' }
    }
    const quality = new Quality({ bitrate: exportBitrate(width) })
    const supported = await canEncodeVideo('avc', { width, height, quality, latencyMode: 'quality' })
    return supported
      ? { supported: true }
      : { supported: false, reason: `H.264 encoding is unavailable at ${width}×${height}.` }
  } catch {
    return { supported: false, reason: 'The MP4 encoder could not be initialized in this browser.' }
  }
}

async function exportWebmTimelapse(options: ExportOptions, plan: TimelapseFrame[]): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser does not support video recording.')
  const { canvas, context } = createComposite(options)

  const stream = canvas.captureStream(options.fps)
  const preferredTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: exportBitrate(options.width),
  })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data) }
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve()
    recorder.onerror = () => reject(new Error('The browser video encoder failed.'))
  })
  recorder.start(500)

  const frameDuration = 1000 / options.fps
  for (const frame of plan) {
    const frameStartedAt = performance.now()
    await renderCompositeFrame(options, context, frame)
    const remainingFrameTime = Math.max(0, frameDuration - (performance.now() - frameStartedAt))
    if (remainingFrameTime > 0) await new Promise((resolve) => setTimeout(resolve, remainingFrameTime))
  }
  recorder.stop()
  await stopped
  options.onProgress(1)
  return new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
}

async function exportMp4Timelapse(options: ExportOptions, plan: TimelapseFrame[]): Promise<Blob> {
  const support = await probeMp4Export(options.width, options.height)
  if (!support.supported) throw new Error(`${support.reason ?? 'MP4 export is unavailable.'} Choose WebM and retry.`)
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } = await import('mediabunny')
  const { canvas, context } = createComposite(options)
  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })
  const source = new CanvasSource(canvas, {
    codec: 'avc',
    quality: new Quality({ bitrate: exportBitrate(options.width) }),
    keyFrameInterval: 2,
    latencyMode: 'quality',
    alpha: 'discard',
  })
  output.addVideoTrack(source, { frameRate: options.fps })
  await output.start()
  try {
    for (const frame of plan) {
      await renderCompositeFrame(options, context, frame)
      await source.add(frame.timestamp, frame.duration, { keyFrame: frame.frame % (2 * options.fps) === 0 })
    }
    await output.finalize()
  } catch (reason) {
    await output.cancel().catch(() => undefined)
    throw reason
  }
  if (!target.buffer) throw new Error('The MP4 encoder finished without producing a file. Choose WebM and retry.')
  options.onProgress(1)
  return new Blob([target.buffer], { type: 'video/mp4' })
}

export async function exportTimelapse(options: ExportOptions): Promise<Blob> {
  const plan = buildTimelapseFramePlan(options.history, options.snapshotCount, options.duration, options.fps, options.pacing)
  return options.format === 'mp4'
    ? exportMp4Timelapse(options, plan)
    : exportWebmTimelapse(options, plan)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
