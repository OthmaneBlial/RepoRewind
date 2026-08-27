import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  BranchIcon,
  ArrowIcon,
  ChevronIcon,
  CloseIcon,
  CommitIcon,
  CompareIcon,
  ExpandIcon,
  FileIcon,
  FilmIcon,
  GithubIcon,
  LayersIcon,
  PauseIcon,
  PersonIcon,
  PinIcon,
  PlayIcon,
  SearchIcon,
  SparkIcon,
  TagIcon,
  UploadIcon,
} from './components/icons'
import { compareHistoryFrames, type HistoryComparison } from './core/compare'
import { buildHistoryIndex, HistoryEngine } from './core/history'
import { buildCityLayout } from './core/layout'
import { prepareHistoryFile } from './core/prepare-history'
import { searchArchive, type ArchiveSearchKind, type ArchiveSearchResult } from './core/search'
import { sampleEvenly } from './core/timeline'
import type { FileSnapshot, HistoryIndex, RepositoryHistory } from './core/types'
import { sampleHistory } from './data/sample-history'
import {
  downloadBlob,
  exportTimelapse,
  historyFilmFilename,
  probeMp4Export,
  type Mp4ExportSupport,
  type TimelapseFormat,
} from './export/timelapse'

const CityScene = lazy(() => import('./components/CityScene').then((module) => ({ default: module.CityScene })))
const MAX_TIMELINE_MARKERS_PER_KIND = 96

const formatDate = (date: string, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(date))

const formatCompact = (value: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

export function safeRepositoryUrl(remote?: string): string | undefined {
  if (!remote) return undefined
  if (
    Array.from(remote).some((character) => {
      const code = character.codePointAt(0) ?? 0
      return code < 32 || code === 127
    })
  )
    return undefined
  const normalized = remote.replace(/^git@github\.com:/, 'https://github.com/')
  try {
    const url = new URL(normalized)
    if (url.username || url.password) return undefined
    url.pathname = url.pathname.replace(/\.git$/, '')
    url.search = ''
    url.hash = ''
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
    return url.protocol === 'https:' || (url.protocol === 'http:' && loopback) ? url.href : undefined
  } catch {
    return undefined
  }
}

const eraName = (index: number, total: number) => {
  const progress = index / Math.max(1, total - 1)
  if (progress < 0.14) return 'The foundation'
  if (progress < 0.34) return 'Early settlement'
  if (progress < 0.58) return 'The great expansion'
  if (progress < 0.78) return 'The rebuilding years'
  return 'The modern city'
}

function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

function CityLoading() {
  return (
    <output className="city-loading">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <strong>Surveying the city…</strong>
      <small>Loading the WebGL renderer</small>
    </output>
  )
}

interface ModalProps {
  title: string
  eyebrow: string
  children: React.ReactNode
  onClose: () => void
  className?: string
  closeLabel?: string
}

function Modal({ title, eyebrow, children, onClose, className = '', closeLabel = 'Close dialog' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )
    const preferredFocus = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')
    ;(preferredFocus ?? focusable()[0])?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab') {
        const elements = focusable()
        if (elements.length === 0) return
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      if (dialog?.open) {
        if (typeof dialog.close === 'function') dialog.close()
        else dialog.removeAttribute('open')
      }
      previouslyFocused?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <button className="icon-button modal-close" onClick={onClose} aria-label={closeLabel}>
        <CloseIcon />
      </button>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  )
}

function ImportModal({
  onClose,
  onImport,
  onResetDemo,
  isDemo,
}: {
  onClose: () => void
  onImport: (file: File, onProgress: (progress: number) => void, signal: AbortSignal) => Promise<void>
  onResetDemo: () => void
  isDemo: boolean
}) {
  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [progress, setProgress] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const importController = useRef<AbortController | undefined>(undefined)
  const close = () => {
    importController.current?.abort()
    onClose()
  }
  const readFile = async (file?: File) => {
    if (!file) return
    const controller = new AbortController()
    importController.current?.abort()
    importController.current = controller
    try {
      setError('')
      setPreparing(true)
      setProgress(0)
      await onImport(file, setProgress, controller.signal)
      onClose()
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return
      setError(reason instanceof Error ? reason.message : 'This file could not be imported.')
    } finally {
      if (importController.current === controller) importController.current = undefined
      setPreparing(false)
    }
  }
  return (
    <Modal
      eyebrow="Open a city"
      title="Bring your repository’s past to life."
      onClose={close}
      closeLabel={preparing ? 'Cancel import' : 'Close dialog'}
    >
      <p className="modal-lead">
        Analyze locally—your source code never leaves your machine. RepoRewind only exports structural Git history.
      </p>
      <button
        className={`drop-zone ${preparing ? 'preparing' : ''}`}
        disabled={preparing}
        onClick={() => input.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          void readFile(event.dataTransfer.files[0])
        }}
      >
        {preparing ? (
          <span className="archive-loader" style={{ '--load-progress': `${progress * 100}%` } as React.CSSProperties}>
            <i />
          </span>
        ) : (
          <UploadIcon />
        )}
        <strong>{preparing ? 'Indexing the archive…' : 'Choose a history file'}</strong>
        <span>
          {preparing
            ? `${Math.round(progress * 100)}% · building temporal checkpoints off the main thread`
            : 'or drop reporewind-history.json here'}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void readFile(event.target.files?.[0])}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="demo-reset-row">
        <span>
          <b>Just exploring?</b> The bundled archive is fictional, deterministic, and requires no setup.
        </span>
        <button
          disabled={isDemo || preparing}
          onClick={() => {
            onResetDemo()
            onClose()
          }}
        >
          {isDemo ? 'Demo active' : 'Open demo'}
        </button>
      </div>
      <div className="terminal-card">
        <div className="terminal-chrome">
          <i />
          <i />
          <i />
          <span>Terminal</span>
        </div>
        <code>
          <b>$</b> npm run analyze -- /path/to/repository --output ./reporewind-history.json
          <br />
          <b>→</b> Select Import and choose the generated JSON
        </code>
      </div>
      <p className="privacy-note">
        Selected archives are processed in this tab and never uploaded. Contributor emails are omitted by default;
        binary contents and source code are never included.
      </p>
    </Modal>
  )
}

interface ExportSettings {
  format: TimelapseFormat
  duration: number
  fps: number
  width: number
  height: number
  pacing: 'activity' | 'chronological'
}

function ExportModal({
  onClose,
  onCancel,
  onExport,
  progress,
  exporting,
}: {
  onClose: () => void
  onCancel: () => void
  onExport: (settings: ExportSettings) => void
  progress: number
  exporting: boolean
}) {
  const [duration, setDuration] = useState(16)
  const [resolution, setResolution] = useState('1080')
  const [pacing, setPacing] = useState<'activity' | 'chronological'>('activity')
  const [format, setFormat] = useState<TimelapseFormat>('mp4')
  const [mp4Support, setMp4Support] = useState<Mp4ExportSupport>()
  const dimensions = resolution === '4k' ? { width: 3840, height: 2160 } : { width: 1920, height: 1080 }
  const settings = { format, duration, fps: 30, ...dimensions, pacing }
  useEffect(() => {
    let current = true
    void probeMp4Export(dimensions.width, dimensions.height).then((support) => {
      if (!current) return
      setMp4Support(support)
      if (!support.supported) setFormat('webm')
    })
    return () => {
      current = false
    }
  }, [dimensions.height, dimensions.width])
  return (
    <Modal
      eyebrow="Archive cinema"
      title="Direct your time-lapse."
      onClose={exporting ? onCancel : onClose}
      closeLabel={exporting ? 'Cancel film export' : 'Close dialog'}
    >
      <p className="modal-lead">
        RepoRewind composes a clean, presentation-ready film with dates, commit titles, city statistics, and a cinematic
        grade.
      </p>
      <div className="export-preview">
        <div className="preview-horizon" />
        <div className="preview-title">
          <span>REPOSITORY HISTORY</span>
          <strong>
            Every commit
            <br />
            left a mark.
          </strong>
        </div>
        <div className="preview-frame">16:9</div>
      </div>
      <div className="option-grid">
        <fieldset>
          <legend>Resolution</legend>
          <div className="segmented">
            <button
              className={resolution === '1080' ? 'active' : ''}
              onClick={() => {
                setMp4Support(undefined)
                setResolution('1080')
              }}
            >
              1080p
            </button>
            <button
              className={resolution === '4k' ? 'active' : ''}
              onClick={() => {
                setMp4Support(undefined)
                setResolution('4k')
              }}
            >
              4K
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>Length</legend>
          <div className="segmented">
            {[12, 16, 24].map((value) => (
              <button key={value} className={duration === value ? 'active' : ''} onClick={() => setDuration(value)}>
                {value}s
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Pacing</legend>
          <div className="segmented">
            <button className={pacing === 'activity' ? 'active' : ''} onClick={() => setPacing('activity')}>
              Activity
            </button>
            <button className={pacing === 'chronological' ? 'active' : ''} onClick={() => setPacing('chronological')}>
              Calendar
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>Delivery</legend>
          <div className="segmented">
            <button
              className={format === 'mp4' ? 'active' : ''}
              disabled={!mp4Support?.supported}
              title={mp4Support?.reason}
              onClick={() => setFormat('mp4')}
            >
              MP4
            </button>
            <button className={format === 'webm' ? 'active' : ''} onClick={() => setFormat('webm')}>
              WebM
            </button>
          </div>
        </fieldset>
      </div>
      <p className={`format-status ${mp4Support?.supported ? 'available' : ''}`} aria-live="polite">
        {!mp4Support
          ? 'Checking this browser’s H.264 encoder…'
          : mp4Support.supported
            ? 'MP4 uses a fixed frame timeline for editing and presentation. WebM remains available as a compatibility path.'
            : `${mp4Support.reason} WebM is selected.`}
      </p>
      {exporting ? (
        <div className="export-progress" aria-live="polite">
          <progress aria-label="Film rendering progress" max={1} value={progress} />
          <p>
            Rendering film… <b>{Math.round(progress * 100)}%</b>
          </p>
          <button className="cancel-action" onClick={onCancel}>
            Cancel export
          </button>
        </div>
      ) : (
        <button className="primary-action" onClick={() => onExport(settings)}>
          <FilmIcon /> Render {format.toUpperCase()} film
        </button>
      )}
      <p className="privacy-note">
        Rendered entirely in your browser. For best results, keep this tab visible until encoding is complete.
      </p>
    </Modal>
  )
}

function SearchResultIcon({ kind }: { kind: ArchiveSearchKind }) {
  if (kind === 'file') return <FileIcon />
  if (kind === 'commit') return <CommitIcon />
  if (kind === 'contributor') return <PersonIcon />
  if (kind === 'release') return <TagIcon />
  return <BranchIcon />
}

function ArchiveSearchModal({
  history,
  index,
  onClose,
  onNavigate,
}: {
  history: RepositoryHistory
  index: HistoryIndex
  onClose: () => void
  onNavigate: (result: ArchiveSearchResult) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const deferredQuery = useDeferredValue(query)
  const results = useMemo(() => searchArchive(history, index, deferredQuery), [history, index, deferredQuery])
  const landmarks = useMemo(() => {
    const releaseResults: ArchiveSearchResult[] = history.releases
      .map((release) => ({
        id: `landmark-release:${release.tag}`,
        kind: 'release' as const,
        title: release.tag,
        subtitle: release.message ?? 'Historical release',
        index: index.commitIndexByHash.get(release.commitHash) ?? -1,
        score: 0,
      }))
      .filter((result) => result.index >= 0)
    const mergeResults: ArchiveSearchResult[] = index.mergeIndices.map((commitIndex) => ({
      id: `landmark-merge:${history.commits[commitIndex].hash}`,
      kind: 'branch' as const,
      title: history.commits[commitIndex].message,
      subtitle: `${history.commits[commitIndex].parents.length} histories joined`,
      index: commitIndex,
      score: 0,
    }))
    return [...releaseResults, ...mergeResults].sort((left, right) => right.index - left.index).slice(0, 6)
  }, [history, index])
  const visibleResults = query.trim() ? results : landmarks

  const choose = (result: ArchiveSearchResult) => {
    onNavigate(result)
    onClose()
  }

  return (
    <Modal
      className="archive-search-modal"
      eyebrow="Archive passage"
      title="Find any trace in the city."
      onClose={onClose}
    >
      <div className="archive-search-field">
        <SearchIcon />
        <input
          data-autofocus
          role="combobox"
          aria-label="Search repository history"
          aria-expanded="true"
          aria-controls="archive-search-results"
          aria-activedescendant={visibleResults[selected] ? `search-result-${selected}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setSelected((value) => Math.min(Math.max(0, visibleResults.length - 1), value + 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setSelected((value) => Math.max(0, value - 1))
            }
            if (event.key === 'Enter' && visibleResults[selected]) {
              event.preventDefault()
              choose(visibleResults[selected])
            }
          }}
          placeholder="Search files, commits, travelers, releases…"
        />
        <kbd>ESC</kbd>
      </div>
      <div className="search-syntax" aria-label="Search filters">
        {['file:', 'commit:', 'author:', 'release:', 'branch:'].map((filter) => (
          <button
            key={filter}
            onClick={() => {
              setQuery(filter)
              setSelected(0)
            }}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="search-result-heading">
        <span>{query.trim() ? `${visibleResults.length} closest traces` : 'Recent landmarks'}</span>
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigate · <kbd>↵</kbd> open
        </span>
      </div>
      <div className="archive-search-results" id="archive-search-results" role="listbox">
        {visibleResults.map((result, resultIndex) => (
          <button
            key={result.id}
            id={`search-result-${resultIndex}`}
            role="option"
            aria-selected={resultIndex === selected}
            className={resultIndex === selected ? 'active' : ''}
            onMouseEnter={() => setSelected(resultIndex)}
            onClick={() => choose(result)}
          >
            <span className={`result-icon ${result.kind}`}>
              <SearchResultIcon kind={result.kind} />
            </span>
            <span>
              <strong>{result.title}</strong>
              <small>{result.subtitle}</small>
            </span>
            <em>{formatDate(history.commits[result.index].authoredAt, { day: undefined, month: 'short' })}</em>
          </button>
        ))}
        {query.trim() && visibleResults.length === 0 && (
          <div className="search-empty">
            <SearchIcon />
            <strong>No trace found.</strong>
            <span>
              Try fewer words or a scoped filter such as <code>file:</code>.
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toLocaleString()}`

function ComparisonModal({ comparison, onClose }: { comparison: HistoryComparison; onClose: () => void }) {
  return (
    <Modal
      className="comparison-modal"
      eyebrow="Temporal difference"
      title="Two eras. Every structural change."
      onClose={onClose}
    >
      <div className="comparison-years">
        <article>
          <small>Before · {comparison.before.commit.hash.slice(0, 7)}</small>
          <strong>{formatDate(comparison.before.date, { month: 'long' })}</strong>
          <span>
            {comparison.before.activeFiles.toLocaleString()} buildings · {comparison.before.totalLines.toLocaleString()}{' '}
            lines
          </span>
        </article>
        <ArrowIcon />
        <article>
          <small>After · {comparison.after.commit.hash.slice(0, 7)}</small>
          <strong>{formatDate(comparison.after.date, { month: 'long' })}</strong>
          <span>
            {comparison.after.activeFiles.toLocaleString()} buildings · {comparison.after.totalLines.toLocaleString()}{' '}
            lines
          </span>
        </article>
      </div>
      <div className="comparison-metrics">
        <span>
          <small>Commits crossed</small>
          <strong>{comparison.commits.toLocaleString()}</strong>
        </span>
        <span>
          <small>Travelers active</small>
          <strong>{comparison.contributors.toLocaleString()}</strong>
        </span>
        <span>
          <small>Buildings</small>
          <strong className={comparison.filesDelta >= 0 ? 'positive' : 'negative'}>
            {signed(comparison.filesDelta)}
          </strong>
        </span>
        <span>
          <small>Lines</small>
          <strong className={comparison.linesDelta >= 0 ? 'positive' : 'negative'}>
            {signed(comparison.linesDelta)}
          </strong>
        </span>
      </div>
      <div className="change-tally">
        {(['added', 'modified', 'renamed', 'deleted'] as const).map((kind) => (
          <span key={kind} className={kind}>
            <i />
            {comparison.counts[kind]} {kind}
          </span>
        ))}
      </div>
      <div className="comparison-file-list">
        <div className="comparison-list-heading">
          <span>Most consequential sites</span>
          <span>Before → after</span>
        </div>
        {comparison.files.slice(0, 16).map((file) => (
          <div key={`${file.kind}:${file.previousPath ?? ''}:${file.path}`}>
            <i className={file.kind} />
            <span>
              <strong>{file.path}</strong>
              {file.previousPath && <small>from {file.previousPath}</small>}
            </span>
            <em>
              {file.beforeLines.toLocaleString()} → {file.afterLines.toLocaleString()}
            </em>
          </div>
        ))}
        {comparison.files.length === 0 && (
          <p className="comparison-empty">These frames describe the same city state.</p>
        )}
      </div>
      <p className="privacy-note">
        The active city is now a diff lens: mint is new, amber rebuilt, blue renamed, and red demolished.
      </p>
    </Modal>
  )
}

function FileInspector({
  file,
  contributorName,
  onClose,
}: {
  file: FileSnapshot
  contributorName: string
  onClose: () => void
}) {
  return (
    <section className="file-inspector glass-panel" aria-label="Selected building">
      <button className="inspector-close" onClick={onClose} aria-label="Close file inspector">
        <CloseIcon />
      </button>
      <p className="eyebrow">{file.alive ? 'Standing building' : 'Archived ruin'}</p>
      <h3>{file.path.split('/').pop()}</h3>
      <p className="file-path">{file.path}</p>
      <dl>
        <div>
          <dt>District</dt>
          <dd>{file.district}</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{file.language}</dd>
        </div>
        <div>
          <dt>Scale</dt>
          <dd>{file.lines.toLocaleString()} lines</dd>
        </div>
        <div>
          <dt>Last touched by</dt>
          <dd>{contributorName}</dd>
        </div>
      </dl>
    </section>
  )
}

export default function App() {
  const [history, setHistory] = useState<RepositoryHistory>(sampleHistory)
  const [historyIndex, setHistoryIndex] = useState<HistoryIndex>(() => buildHistoryIndex(sampleHistory))
  const [archiveSource, setArchiveSource] = useState<'demo' | 'imported'>('demo')
  const engine = useMemo(() => new HistoryEngine(history, historyIndex), [history, historyIndex])
  const historyLength = engine.length
  const [frame, setFrame] = useState(() => Math.floor(sampleHistory.commits.length * 0.64))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedPath, setSelectedPath] = useState<string>()
  const [importOpen, setImportOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [comparisonBase, setComparisonBase] = useState<number>()
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportWidth, setExportWidth] = useState<number>()
  const [notice, setNotice] = useState<{ message: string; tone: 'status' | 'error' }>()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const exportController = useRef<AbortController | undefined>(undefined)
  const reducedMotion = useReducedMotionPreference()
  const frameRef = useRef(frame)
  useEffect(() => {
    frameRef.current = frame
  }, [frame])
  const snapshot = engine.snapshotAt(Math.min(frame, historyLength - 1))
  const layout = useMemo(() => buildCityLayout(history, { paths: historyIndex.paths }), [history, historyIndex])
  const contributors = useMemo(() => new Map(history.contributors.map((person) => [person.id, person])), [history])
  const currentContributor = contributors.get(snapshot.commit.authorId)
  const selectedFile = selectedPath ? snapshot.files.find((file) => file.path === selectedPath) : undefined
  const comparison = useMemo(
    () => (comparisonBase === undefined ? undefined : compareHistoryFrames(history, engine, comparisonBase, frame)),
    [comparisonBase, engine, frame, history],
  )
  const comparisonHighlights = useMemo(() => {
    if (!comparison || comparison.fromIndex === comparison.toIndex) return undefined
    return new Map(
      comparison.files.flatMap((file) => [
        [file.path, file.kind] as const,
        ...(file.previousPath ? [[file.previousPath, file.kind] as const] : []),
      ]),
    )
  }, [comparison])
  const sourceUrl = safeRepositoryUrl(history.repository.remote)
  const timelineReleases = useMemo(
    () =>
      sampleEvenly(
        history.releases.flatMap((release) => {
          const index = historyIndex.commitIndexByHash.get(release.commitHash)
          return index === undefined ? [] : [{ release, index }]
        }),
        MAX_TIMELINE_MARKERS_PER_KIND,
      ),
    [history.releases, historyIndex],
  )
  const timelineMerges = useMemo(
    () => sampleEvenly(historyIndex.mergeIndices, MAX_TIMELINE_MARKERS_PER_KIND),
    [historyIndex],
  )
  const timelineBranches = useMemo(
    () =>
      sampleEvenly(
        (history.branches ?? []).flatMap((branch) => {
          const index = historyIndex.commitIndexByHash.get(branch.tipHash)
          return index === undefined ? [] : [{ branch, index }]
        }),
        MAX_TIMELINE_MARKERS_PER_KIND,
      ),
    [history.branches, historyIndex],
  )

  const showNotice = useCallback((message: string, tone: 'status' | 'error' = 'status', timeout = 4_000) => {
    if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current)
    setNotice({ message, tone })
    if (timeout > 0) noticeTimer.current = window.setTimeout(() => setNotice(undefined), timeout)
  }, [])

  useEffect(
    () => () => {
      if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current)
      exportController.current?.abort()
    },
    [],
  )

  useEffect(() => {
    if (!playing) return
    const firstFrame = frameRef.current
    const lastFrame = historyLength - 1
    if (lastFrame <= firstFrame) {
      setPlaying(false)
      return
    }
    const framesRemaining = Math.max(1, lastFrame - firstFrame)
    const duration = (36_000 / speed) * (framesRemaining / Math.max(1, lastFrame))
    const startedAt = performance.now()
    let animationFrame = 0
    const advance = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      setFrame(Math.min(lastFrame, Math.round(firstFrame + framesRemaining * progress)))
      if (progress >= 1) setPlaying(false)
      else animationFrame = requestAnimationFrame(advance)
    }
    animationFrame = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(animationFrame)
  }, [playing, speed, historyLength])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        if (!importOpen && !exportOpen && !comparisonOpen) setSearchOpen(true)
        return
      }
      if (event.key === '/' && !target?.matches('input, textarea, select')) {
        event.preventDefault()
        if (!importOpen && !exportOpen && !comparisonOpen) setSearchOpen(true)
        return
      }
      if (target?.matches('input, button, textarea, select')) return
      if (event.code === 'Space') {
        event.preventDefault()
        setPlaying((value) => !value)
      }
      if (event.key === 'ArrowRight') setFrame((value) => Math.min(historyLength - 1, value + 1))
      if (event.key === 'ArrowLeft') setFrame((value) => Math.max(0, value - 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [comparisonOpen, exportOpen, historyLength, importOpen])

  const togglePlayback = () => {
    if (frame >= historyLength - 1) setFrame(0)
    setPlaying((value) => !value)
  }

  const importHistory = async (file: File, onProgress: (progress: number) => void, signal: AbortSignal) => {
    const prepared = await prepareHistoryFile(file, onProgress, signal)
    setHistory(prepared.history)
    setHistoryIndex(prepared.index)
    setArchiveSource('imported')
    setFrame(0)
    setPlaying(false)
    setSelectedPath(undefined)
    setComparisonBase(undefined)
    setComparisonOpen(false)
    showNotice(`${prepared.history.repository.name} is ready to explore.`)
  }

  const resetDemo = () => {
    setHistory(sampleHistory)
    setHistoryIndex(buildHistoryIndex(sampleHistory))
    setArchiveSource('demo')
    setFrame(Math.floor(sampleHistory.commits.length * 0.64))
    setPlaying(false)
    setSelectedPath(undefined)
    setComparisonBase(undefined)
    setComparisonOpen(false)
    showNotice('The fictional ten-year demo archive has been restored.')
  }

  const navigateToSearchResult = (result: ArchiveSearchResult) => {
    setPlaying(false)
    setFrame(result.index)
    if (result.path) setSelectedPath(result.path)
    else if (result.authorId) {
      const traveler = engine.snapshotAt(result.index).travelers.find((entry) => entry.authorId === result.authorId)
      setSelectedPath(traveler?.path)
    } else setSelectedPath(undefined)
  }

  const renderExport = useCallback(
    async (settings: ExportSettings) => {
      const controller = new AbortController()
      exportController.current?.abort()
      exportController.current = controller
      setPlaying(false)
      setExporting(true)
      setExportWidth(settings.width)
      setExportProgress(0)
      const previousFrame = frame
      try {
        const blob = await exportTimelapse({
          ...settings,
          history,
          snapshotCount: historyLength,
          getSnapshot: (index) => engine.snapshotAt(index),
          setFrame,
          getSourceCanvas: () => canvasRef.current,
          onProgress: setExportProgress,
          signal: controller.signal,
        })
        downloadBlob(blob, historyFilmFilename(history.repository.name, settings.format))
        setExportOpen(false)
        showNotice('Your time-lapse film has been rendered.')
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') {
          showNotice('Film export canceled.')
          return
        }
        const message = reason instanceof Error ? reason.message : 'The export could not be completed.'
        showNotice(
          settings.format === 'mp4' && !message.includes('Choose WebM') ? `${message} Choose WebM and retry.` : message,
          'error',
          0,
        )
      } finally {
        setFrame(previousFrame)
        setExporting(false)
        setExportWidth(undefined)
        if (exportController.current === controller) exportController.current = undefined
      }
    },
    [engine, frame, history, historyLength, showNotice],
  )

  const enterFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (stageRef.current?.requestFullscreen) await stageRef.current.requestFullscreen()
      else throw new Error('Fullscreen is unavailable in this browser.')
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Fullscreen could not be opened.', 'error')
    }
  }

  return (
    <main className="app-shell" ref={stageRef}>
      <a href="#timeline" className="skip-link">
        Skip to timeline controls
      </a>
      <div className="atmosphere" aria-hidden="true" />
      <header className="topbar">
        <div className="brand" aria-label="RepoRewind home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>Repo</strong>Rewind
          </span>
        </div>
        <button
          className="repository-switcher"
          onClick={() => setImportOpen(true)}
          aria-label={`Open repository menu: ${archiveSource === 'demo' ? 'fictional demo' : 'local archive'}, ${history.repository.name}`}
        >
          <span className="repo-icon">
            <LayersIcon />
          </span>
          <span>
            <small>{archiveSource === 'demo' ? 'Fictional demo' : 'Local archive'}</small>
            <strong>{history.repository.name}</strong>
          </span>
          <ChevronIcon />
        </button>
        <div className="top-actions">
          <button className="archive-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search archive">
            <SearchIcon />
            <span>Search archive</span>
            <kbd>⌘K</kbd>
          </button>
          <button className="icon-button" onClick={() => void enterFullscreen()} aria-label="Toggle fullscreen">
            <ExpandIcon />
          </button>
          <button className="text-button" onClick={() => setImportOpen(true)}>
            <UploadIcon /> Import
          </button>
          <button className="export-button" onClick={() => setExportOpen(true)}>
            <FilmIcon /> Export film
          </button>
        </div>
      </header>

      <section className="city-stage" aria-label="Interactive repository city">
        <Suspense fallback={<CityLoading />}>
          <CityScene
            snapshot={snapshot}
            layout={layout}
            contributors={history.contributors}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            playing={playing}
            reducedMotion={reducedMotion}
            cinematicProgress={exporting ? exportProgress : undefined}
            renderWidth={exportWidth}
            comparison={comparisonHighlights}
            onCanvas={(canvas) => {
              canvasRef.current = canvas
            }}
          />
        </Suspense>
      </section>

      <aside className="era-panel glass-panel">
        <div className="panel-index">
          {String(frame + 1).padStart(2, '0')}
          <span>/{String(historyLength).padStart(2, '0')}</span>
        </div>
        <p className="eyebrow">
          Chapter {Math.min(5, Math.floor((frame / historyLength) * 5) + 1)}
          {archiveSource === 'demo' && <span className="demo-label">Fictional demo</span>}
        </p>
        <h1>{eraName(frame, historyLength)}</h1>
        <p className="era-date">{formatDate(snapshot.date, { month: 'long' })}</p>
        <div className="commit-card">
          <div className="avatar" style={{ '--avatar-color': currentContributor?.color } as React.CSSProperties}>
            {currentContributor?.name
              .split(' ')
              .map((word) => word[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <small>
              {snapshot.commit.hash.slice(0, 7)} · {currentContributor?.name}
            </small>
            <strong>{snapshot.commit.message}</strong>
          </div>
        </div>
        <div className="change-balance">
          <span>
            <i className="addition" />+{snapshot.additions.toLocaleString()}
          </span>
          <span>
            <i className="deletion" />−{snapshot.deletions.toLocaleString()}
          </span>
          <span>{snapshot.commit.files.length} files reshaped</span>
        </div>
        {(snapshot.isRelease || snapshot.commit.isBaseline || snapshot.isMerge || snapshot.isRefactor) && (
          <div
            className={`event-badge ${snapshot.isRelease ? 'release' : snapshot.commit.isBaseline ? 'baseline' : snapshot.isMerge ? 'merge' : ''}`}
          >
            <SparkIcon />
            <span>
              <small>
                {snapshot.isRelease
                  ? 'Historical release'
                  : snapshot.commit.isBaseline
                    ? 'Archive baseline'
                    : snapshot.isMerge
                      ? 'Branch confluence'
                      : 'Neighborhood rebuilt'}
              </small>
              <strong>
                {snapshot.release?.tag ??
                  (snapshot.commit.isBaseline
                    ? 'Earlier history compacted'
                    : snapshot.isMerge
                      ? `${snapshot.commit.parents.length} histories joined`
                      : 'Refactor detected')}
              </strong>
            </span>
          </div>
        )}
        <div className="era-compare-actions">
          <button
            disabled={comparisonBase === frame}
            onClick={() => {
              if (comparisonBase === undefined) {
                setComparisonBase(frame)
                showNotice('Era pinned. Travel elsewhere on the timeline to compare.')
              } else setComparisonOpen(true)
            }}
          >
            {comparisonBase === undefined ? <PinIcon /> : <CompareIcon />}
            {comparisonBase === undefined ? 'Pin this era' : comparisonBase === frame ? 'Era pinned' : 'Compare eras'}
          </button>
          {comparisonBase !== undefined && (
            <button
              className="clear-comparison"
              onClick={() => {
                setComparisonBase(undefined)
                setComparisonOpen(false)
              }}
              aria-label="Clear comparison"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </aside>

      <aside className="archive-panel glass-panel">
        <p className="eyebrow">City register</p>
        <div className="city-stat">
          <strong>{snapshot.activeFiles.toLocaleString()}</strong>
          <span>
            standing
            <br />
            buildings
          </span>
        </div>
        <div className="city-stat">
          <strong>{formatCompact(snapshot.totalLines)}</strong>
          <span>
            lines in
            <br />
            the skyline
          </span>
        </div>
        <div className="archive-rule" />
        <p className="register-label">Travelers in this history</p>
        <div className="traveler-stack">
          {history.contributors.slice(0, 5).map((person) => (
            <span
              key={person.id}
              title={`${person.name}: ${person.commits} commits`}
              style={{ '--traveler-color': person.color } as React.CSSProperties}
            >
              {person.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)}
            </span>
          ))}
          {history.contributors.length > 5 && <b>+{history.contributors.length - 5}</b>}
        </div>
        <div className="branch-register">
          <BranchIcon />
          <span>
            <strong>{history.branches?.length ?? 0}</strong> branches
          </span>
          <span>
            <strong>{historyIndex.mergeIndices.length}</strong> merges
          </span>
        </div>
        <div className="legend">
          <span>
            <i className="legend-building" /> Living file
          </span>
          <span>
            <i className="legend-traveler" /> Contributor
          </span>
          <span>
            <i className="legend-ruin" /> Deleted code
          </span>
        </div>
      </aside>

      {selectedFile && (
        <FileInspector
          file={selectedFile}
          contributorName={contributors.get(selectedFile.lastAuthorId)?.name ?? 'Unknown'}
          onClose={() => setSelectedPath(undefined)}
        />
      )}

      {comparison && (
        <section
          className={`comparison-bar glass-panel ${comparison.fromIndex === comparison.toIndex ? 'waiting' : ''}`}
          aria-live="polite"
        >
          <span className="comparison-pin">
            <PinIcon />
          </span>
          <div>
            <small>Before</small>
            <strong>{formatDate(comparison.before.date, { day: undefined, month: 'short' })}</strong>
          </div>
          <ArrowIcon />
          <div>
            <small>After</small>
            <strong>
              {comparison.fromIndex === comparison.toIndex
                ? 'Choose another era'
                : formatDate(comparison.after.date, { day: undefined, month: 'short' })}
            </strong>
          </div>
          {comparison.fromIndex !== comparison.toIndex && (
            <p>
              <b>{signed(comparison.linesDelta)}</b> lines · <b>{comparison.files.length}</b> sites changed
            </p>
          )}
          <button
            className="comparison-open"
            disabled={comparison.fromIndex === comparison.toIndex}
            onClick={() => setComparisonOpen(true)}
          >
            Open diff <CompareIcon />
          </button>
          <button
            className="comparison-clear"
            onClick={() => {
              setComparisonBase(undefined)
              setComparisonOpen(false)
            }}
            aria-label="Clear comparison"
          >
            <CloseIcon />
          </button>
        </section>
      )}

      <section className="timeline-console glass-panel" id="timeline">
        <button
          className="play-button"
          onClick={togglePlayback}
          aria-label={playing ? 'Pause history' : 'Play history'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="timeline-main">
          <div className="timeline-labels">
            <span>
              {formatDate(history.repository.firstCommitAt, { month: 'short', year: 'numeric', day: undefined })}
            </span>
            <strong>{formatDate(snapshot.date, { month: 'long' })}</strong>
            <span>
              {formatDate(history.repository.lastCommitAt, { month: 'short', year: 'numeric', day: undefined })}
            </span>
          </div>
          <div className="timeline-track">
            {timelineReleases.map(({ release, index }) => (
              <button
                key={release.tag}
                className="release-marker"
                style={{ left: `${(index / Math.max(1, historyLength - 1)) * 100}%` }}
                onClick={() => {
                  setPlaying(false)
                  setFrame(index)
                }}
                aria-label={`Go to release ${release.tag}: ${formatDate(release.date)}`}
              />
            ))}
            {timelineMerges.map((mergeIndex) => (
              <button
                key={`merge-${mergeIndex}`}
                className="merge-marker"
                style={{ left: `${(mergeIndex / Math.max(1, historyLength - 1)) * 100}%` }}
                onClick={() => {
                  setPlaying(false)
                  setFrame(mergeIndex)
                }}
                aria-label={`Go to merge: ${history.commits[mergeIndex].message}`}
              />
            ))}
            {timelineBranches.map(({ branch, index }) => (
              <button
                key={branch.name}
                className="branch-marker"
                style={
                  {
                    left: `${(index / Math.max(1, historyLength - 1)) * 100}%`,
                    '--branch-color': branch.color,
                  } as React.CSSProperties
                }
                onClick={() => {
                  setPlaying(false)
                  setFrame(index)
                }}
                aria-label={`Go to branch tip ${branch.name}`}
              />
            ))}
            <input
              aria-label="History position"
              aria-valuetext={`${formatDate(snapshot.date)}: ${snapshot.commit.message}`}
              type="range"
              min="0"
              max={historyLength - 1}
              value={frame}
              onChange={(event) => {
                setPlaying(false)
                setFrame(Number(event.target.value))
              }}
              style={{ '--progress': `${(frame / Math.max(1, historyLength - 1)) * 100}%` } as React.CSSProperties}
            />
          </div>
        </div>
        <div className="speed-control">
          <small>Playback</small>
          <button
            aria-label={`Playback speed ${speed} times; activate to change`}
            onClick={() => setSpeed((value) => (value >= 4 ? 0.5 : value * 2))}
          >
            {speed}×
          </button>
        </div>
        <div className="branch-chip">
          <BranchIcon />
          <span>
            <small>Branch</small>
            <strong>{history.repository.branch}</strong>
          </span>
        </div>
      </section>

      <footer className="stage-footer">
        <span>Drag to orbit · Scroll to fly · Space to play</span>
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            <GithubIcon /> View source · MIT
          </a>
        ) : (
          <span className="source-label">
            <GithubIcon /> Open source · MIT
          </span>
        )}
      </footer>

      {notice && (
        <div className={`toast ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.message}
        </div>
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={importHistory}
          onResetDemo={resetDemo}
          isDemo={archiveSource === 'demo'}
        />
      )}
      {searchOpen && (
        <ArchiveSearchModal
          history={history}
          index={historyIndex}
          onClose={() => setSearchOpen(false)}
          onNavigate={navigateToSearchResult}
        />
      )}
      {comparisonOpen && comparison && comparison.fromIndex !== comparison.toIndex && (
        <ComparisonModal comparison={comparison} onClose={() => setComparisonOpen(false)} />
      )}
      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          onCancel={() => exportController.current?.abort()}
          onExport={(settings) => void renderExport(settings)}
          progress={exportProgress}
          exporting={exporting}
        />
      )}
    </main>
  )
}
