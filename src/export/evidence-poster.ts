import { buildStoryPlan } from '../core/story-director'
import { displayDate, displayRepositoryName, type SharePrivacySettings } from '../core/privacy'
import type { HistoryIndex, HistorySnapshot, RepositoryHistory } from '../core/types'

export const EVIDENCE_POSTER_FILENAME = 'repo-rewind-evidence-poster.png'

export interface EvidencePosterModel {
  repository: string
  range: string
  stats: Array<{ label: string; value: string }>
  activity: Array<{ year: string; commits: number }>
  chapters: Array<{ title: string; range: string }>
  note: string
}

export function buildEvidencePosterModel(
  history: RepositoryHistory,
  index: HistoryIndex,
  snapshot: HistorySnapshot,
  privacy: SharePrivacySettings,
): EvidencePosterModel {
  const years = new Map<string, number>()
  for (const commit of history.commits) {
    const year = String(new Date(commit.authoredAt).getUTCFullYear())
    years.set(year, (years.get(year) ?? 0) + 1)
  }
  const plan = buildStoryPlan(history)
  return {
    repository: displayRepositoryName(history, privacy),
    range: `${displayDate(history.repository.firstCommitAt, privacy)} — ${displayDate(history.repository.lastCommitAt, privacy)}`,
    stats: [
      { label: 'Commits', value: history.commits.length.toLocaleString('en') },
      { label: 'Paths observed', value: index.paths.length.toLocaleString('en') },
      { label: 'Contributors', value: history.contributors.length.toLocaleString('en') },
      { label: 'Releases', value: history.releases.length.toLocaleString('en') },
      { label: 'Standing files', value: snapshot.activeFiles.toLocaleString('en') },
      { label: 'Deleted traces', value: snapshot.files.filter((file) => !file.alive).length.toLocaleString('en') },
    ],
    activity: Array.from(years, ([year, commits]) => ({ year, commits }))
      .sort((left, right) => left.year.localeCompare(right.year))
      .slice(-10),
    chapters: plan.chapters.slice(0, 4).map((chapter) => ({
      title: chapter.title,
      range: `Commits ${chapter.startIndex + 1}–${chapter.endIndex + 1}`,
    })),
    note: history.repository.truncated
      ? 'PARTIAL ARCHIVE · AGGREGATE GIT EVIDENCE ONLY'
      : 'COMPLETE ANALYZED RANGE · AGGREGATE GIT EVIDENCE ONLY',
  }
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.fill()
  context.stroke()
}

export async function exportEvidencePoster(model: EvidencePosterModel): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('The evidence poster renderer is unavailable.')

  const background = context.createLinearGradient(0, 0, 1200, 630)
  background.addColorStop(0, '#101713')
  background.addColorStop(0.58, '#18231d')
  background.addColorStop(1, '#2b251c')
  context.fillStyle = background
  context.fillRect(0, 0, 1200, 630)
  context.fillStyle = 'rgba(236, 178, 104, .08)'
  context.beginPath()
  context.arc(1040, 70, 300, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#d98a42'
  context.font = '700 14px ui-monospace, monospace'
  context.letterSpacing = '3px'
  context.fillText('REPOREWIND  /  EVIDENCE POSTER', 58, 62)
  context.fillStyle = '#f4ead8'
  context.font = '600 54px Georgia, serif'
  context.fillText(model.repository, 58, 130, 760)
  context.fillStyle = '#9eaaa2'
  context.font = '500 16px ui-monospace, monospace'
  context.fillText(model.range.toUpperCase(), 60, 164)

  model.stats.forEach((stat, statIndex) => {
    const column = statIndex % 3
    const row = Math.floor(statIndex / 3)
    const x = 58 + column * 190
    const y = 210 + row * 102
    context.fillStyle = 'rgba(255, 255, 255, .035)'
    context.strokeStyle = 'rgba(237, 226, 205, .12)'
    context.lineWidth = 1
    drawRoundedRect(context, x, y, 172, 82, 7)
    context.fillStyle = '#f0dfc6'
    context.font = '600 30px Georgia, serif'
    context.fillText(stat.value, x + 16, y + 38)
    context.fillStyle = '#7f9187'
    context.font = '700 10px ui-monospace, monospace'
    context.fillText(stat.label.toUpperCase(), x + 16, y + 61)
  })

  const chartX = 650
  const chartY = 214
  const chartWidth = 490
  const chartHeight = 140
  context.fillStyle = '#d8cdbb'
  context.font = '600 13px ui-monospace, monospace'
  context.fillText('ACTIVITY BY UTC AUTHOR YEAR', chartX, chartY - 20)
  const maximum = Math.max(1, ...model.activity.map((entry) => entry.commits))
  const gap = 8
  const barWidth = Math.max(18, (chartWidth - gap * Math.max(0, model.activity.length - 1)) / model.activity.length)
  model.activity.forEach((entry, index) => {
    const height = Math.max(8, (entry.commits / maximum) * chartHeight)
    const x = chartX + index * (barWidth + gap)
    const y = chartY + chartHeight - height
    const bar = context.createLinearGradient(0, y, 0, chartY + chartHeight)
    bar.addColorStop(0, '#e79a50')
    bar.addColorStop(1, '#725437')
    context.fillStyle = bar
    context.fillRect(x, y, barWidth, height)
    context.fillStyle = '#7f9187'
    context.font = '600 9px ui-monospace, monospace'
    context.fillText(entry.year, x, chartY + chartHeight + 18)
  })

  context.fillStyle = '#d8cdbb'
  context.font = '600 13px ui-monospace, monospace'
  context.fillText('DETERMINISTIC STORY CHAPTERS', chartX, 414)
  model.chapters.forEach((chapter, index) => {
    const y = 447 + index * 33
    context.fillStyle = '#d98a42'
    context.font = '700 11px ui-monospace, monospace'
    context.fillText(String(index + 1).padStart(2, '0'), chartX, y)
    context.fillStyle = '#eee2ce'
    context.font = '600 15px Georgia, serif'
    context.fillText(chapter.title, chartX + 35, y)
    context.fillStyle = '#798a81'
    context.font = '500 10px ui-monospace, monospace'
    context.fillText(chapter.range, 1010, y)
  })

  context.strokeStyle = 'rgba(237, 226, 205, .13)'
  context.beginPath()
  context.moveTo(58, 573)
  context.lineTo(1142, 573)
  context.stroke()
  context.fillStyle = '#7f9187'
  context.font = '600 10px ui-monospace, monospace'
  context.fillText(model.note, 58, 601)
  context.textAlign = 'right'
  context.fillStyle = '#d98a42'
  context.fillText('GENERATED LOCALLY · NO SOURCE CODE UPLOADED', 1142, 601)
  context.textAlign = 'left'

  return new Promise<Blob>((resolvePoster, rejectPoster) => {
    canvas.toBlob(
      (blob) => (blob ? resolvePoster(blob) : rejectPoster(new Error('The PNG encoder returned no poster.'))),
      'image/png',
    )
  })
}
