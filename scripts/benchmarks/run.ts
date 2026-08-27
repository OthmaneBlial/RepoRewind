import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import os from 'node:os'
import { dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { analyzeRepositoryStreaming } from '../../cli/git-reader'
import { startViewerServer, type ViewerSession } from '../../cli/viewer-server'
import { buildHistoryIndex, HistoryEngine, validateHistory } from '../../src/core/history'
import { buildCityLayout } from '../../src/core/layout'
import type { RepositoryHistory } from '../../src/core/types'

interface BenchmarkBudget {
  analyzerMs: number
  indexMs: number
  firstInteractiveMs: number
}

interface FixtureDefinition {
  id: 'small' | 'medium' | 'large'
  commits: number
  changesPerCommit: number
  paths: number
  contributors: number
  releases: number
  budgets: BenchmarkBudget
}

interface FixtureManifest {
  schemaVersion: 1
  fixtureVersion: string
  fixtures: FixtureDefinition[]
}

interface NodeMeasurement {
  fixture: string
  commits: number
  fileChanges: number
  finalPaths: number
  contributors: number
  releases: number
  archiveBytes: number
  analyzerMs: number
  analyzerPeakRssDeltaMiB: number
  analyzerPeakHeapDeltaMiB: number
  parseMs: number
  validationMs: number
  indexMs: number
  layoutMs: number
  firstSnapshotMs: number
  snapshotTraversalFps: number
  budget: BenchmarkBudget
  withinAdvisoryNodeBudget: boolean
}

interface BrowserMeasurement {
  fixture: string
  worker: boolean
  firstInteractiveMs: number
  playbackFps: number
  longTasks: number
  maxLongTaskMs: number
  totalLongTaskMs: number
  rendererTier: string
  webgl: string
  canvasPixels: string
  withinAdvisoryBudget: boolean
}

interface BrowserExportMeasurement {
  fixture: string
  format: 'webm'
  durationSeconds: 12
  width: 640
  height: 360
  filmMs: number
  storyPackMs: number
  totalMs: number
  bytes: number
}

interface NoWebglMeasurement {
  fallbackVisible: boolean
  searchUsable: boolean
  insightsUsable: boolean
  comparisonUsable: boolean
  storyNavigationUsable: boolean
  compactLayoutUsable: boolean
  posterFilename: string
  posterBytes: number
  posterWidth: number
  posterHeight: number
  pageError?: string
}

interface BenchmarkResult {
  schemaVersion: 1
  fixtureVersion: string
  repoRewindVersion: string
  generatedAt: string
  advisoryOnly: true
  environment: {
    platform: string
    release: string
    architecture: string
    cpu: string
    cpuCount: number
    memoryGiB: number
    node: string
    git: string
    browser: string
    deviceScaleFactor: 2
    headless: true
  }
  node: NodeMeasurement[]
  browser: {
    workers: BrowserMeasurement[]
    noWorker: BrowserMeasurement
    noWebgl: NoWebglMeasurement
    export: BrowserExportMeasurement
  }
}

const repositoryRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const manifestPath = resolve(repositoryRoot, 'benchmarks/fixtures/v1.json')
const packagePath = resolve(repositoryRoot, 'package.json')

function round(value: number, digits = 2): number {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function commandVersion(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  return result.status === 0 ? `${result.stdout}${result.stderr}`.trim().split('\n')[0] : 'unavailable'
}

function readManifest(): FixtureManifest {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as FixtureManifest
  if (manifest.schemaVersion !== 1 || !manifest.fixtureVersion || manifest.fixtures.length !== 3) {
    throw new Error('The benchmark fixture manifest is invalid.')
  }
  for (const fixture of manifest.fixtures) {
    for (const value of [
      fixture.commits,
      fixture.changesPerCommit,
      fixture.paths,
      fixture.contributors,
      fixture.releases,
    ]) {
      if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${fixture.id} fixture size.`)
    }
  }
  return manifest
}

async function writeImporter(importer: ReturnType<typeof spawn>, value: string): Promise<void> {
  if (!importer.stdin.write(value)) await once(importer.stdin, 'drain')
}

async function createGitFixture(root: string, fixture: FixtureDefinition): Promise<string> {
  const repository = resolve(root, fixture.id)
  mkdirSync(repository, { recursive: true })
  const initialized = spawnSync('git', ['init', '--quiet', '--initial-branch=main', repository], { encoding: 'utf8' })
  if (initialized.status !== 0) throw new Error(initialized.stderr || `Could not initialize ${fixture.id}.`)

  const importer = spawn('git', ['-C', repository, 'fast-import', '--quiet'], {
    stdio: ['pipe', 'ignore', 'pipe'],
  })
  let stderr = ''
  importer.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8')
  })
  const commitMarkOffset = 1_000_000
  let blobMark = 1
  const startedAt = 1_609_459_200
  for (let commitIndex = 0; commitIndex < fixture.commits; commitIndex += 1) {
    const operations: string[] = []
    for (let changeIndex = 0; changeIndex < fixture.changesPerCommit; changeIndex += 1) {
      const pathIndex = (commitIndex * fixture.changesPerCommit + changeIndex) % fixture.paths
      const district = pathIndex % Math.max(4, Math.ceil(fixture.paths / 180))
      const path = `packages/district-${String(district).padStart(2, '0')}/src/file-${String(pathIndex).padStart(5, '0')}.ts`
      const content = `// deterministic RepoRewind benchmark fixture\nexport const revision = ${commitIndex};\nexport const pathId = ${pathIndex};\n`
      const mark = blobMark++
      await writeImporter(importer, `blob\nmark :${mark}\ndata ${Buffer.byteLength(content)}\n${content}`)
      operations.push(`M 100644 :${mark} ${path}`)
    }
    const authorIndex = commitIndex % fixture.contributors
    const timestamp = startedAt + commitIndex * 21_600
    const message = `Benchmark change ${String(commitIndex + 1).padStart(5, '0')}`
    const parent = commitIndex > 0 ? `from :${commitMarkOffset + commitIndex - 1}\n` : ''
    await writeImporter(
      importer,
      `commit refs/heads/main\nmark :${commitMarkOffset + commitIndex}\nauthor Benchmark Author ${authorIndex + 1} <author-${authorIndex + 1}@example.invalid> ${timestamp} +0000\ncommitter Benchmark Author ${authorIndex + 1} <author-${authorIndex + 1}@example.invalid> ${timestamp} +0000\ndata ${Buffer.byteLength(message)}\n${message}\n${parent}${operations.join('\n')}\n\n`,
    )
  }
  importer.stdin.end()
  const [status] = (await once(importer, 'close')) as [number]
  if (status !== 0) throw new Error(stderr.trim() || `git fast-import failed for ${fixture.id}.`)

  const hashes = commandOutput('git', ['-C', repository, 'rev-list', '--reverse', 'main']).split('\n').filter(Boolean)
  for (let releaseIndex = 1; releaseIndex <= fixture.releases; releaseIndex += 1) {
    const index = Math.min(hashes.length - 1, Math.round((releaseIndex / fixture.releases) * hashes.length) - 1)
    const tagged = spawnSync('git', ['-C', repository, 'tag', `v${releaseIndex}.0.0`, hashes[index]], {
      encoding: 'utf8',
    })
    if (tagged.status !== 0) throw new Error(tagged.stderr || `Could not tag ${fixture.id}.`)
  }
  return repository
}

function commandOutput(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed.`)
  return result.stdout.trim()
}

function beginMemorySample() {
  const baseline = process.memoryUsage()
  let peakRss = baseline.rss
  let peakHeap = baseline.heapUsed
  const sample = () => {
    const current = process.memoryUsage()
    peakRss = Math.max(peakRss, current.rss)
    peakHeap = Math.max(peakHeap, current.heapUsed)
  }
  const timer = setInterval(sample, 5)
  return () => {
    clearInterval(timer)
    sample()
    return {
      rssDeltaMiB: round(Math.max(0, peakRss - baseline.rss) / 1024 / 1024),
      heapDeltaMiB: round(Math.max(0, peakHeap - baseline.heapUsed) / 1024 / 1024),
    }
  }
}

function measure<T>(operation: () => T): { value: T; ms: number } {
  const started = performance.now()
  const value = operation()
  return { value, ms: round(performance.now() - started) }
}

async function measureNodeFixture(
  repository: string,
  fixture: FixtureDefinition,
): Promise<{ measurement: NodeMeasurement; history: RepositoryHistory }> {
  globalThis.gc?.()
  const stopMemory = beginMemorySample()
  const analyzerStarted = performance.now()
  const analyzed = await analyzeRepositoryStreaming(repository)
  const analyzerMs = round(performance.now() - analyzerStarted)
  const analyzerMemory = stopMemory()
  if (analyzed.commits.length !== fixture.commits) {
    throw new Error(`${fixture.id} produced ${analyzed.commits.length} commits instead of ${fixture.commits}.`)
  }
  const serialized = JSON.stringify(analyzed)
  const parsed = measure(() => JSON.parse(serialized) as unknown)
  const validated = measure(() => validateHistory(parsed.value))
  const indexed = measure(() => buildHistoryIndex(validated.value))
  const engine = new HistoryEngine(validated.value, indexed.value)
  const firstSnapshot = measure(() => engine.snapshotAt(validated.value.commits.length - 1))
  const layout = measure(() => buildCityLayout(validated.value, { paths: indexed.value.paths }))
  const sampleCount = Math.min(600, validated.value.commits.length)
  const traversalStarted = performance.now()
  for (let sample = 0; sample < sampleCount; sample += 1) {
    engine.snapshotAt(Math.round((sample / Math.max(1, sampleCount - 1)) * (validated.value.commits.length - 1)))
  }
  const traversalSeconds = Math.max(0.000_001, (performance.now() - traversalStarted) / 1000)
  const fileChanges = validated.value.commits.reduce((total, commit) => total + commit.files.length, 0)
  return {
    history: validated.value,
    measurement: {
      fixture: fixture.id,
      commits: validated.value.commits.length,
      fileChanges,
      finalPaths: firstSnapshot.value.files.filter((file) => file.alive).length,
      contributors: validated.value.contributors.length,
      releases: validated.value.releases.length,
      archiveBytes: Buffer.byteLength(serialized),
      analyzerMs,
      analyzerPeakRssDeltaMiB: analyzerMemory.rssDeltaMiB,
      analyzerPeakHeapDeltaMiB: analyzerMemory.heapDeltaMiB,
      parseMs: parsed.ms,
      validationMs: validated.ms,
      indexMs: indexed.ms,
      layoutMs: layout.ms,
      firstSnapshotMs: firstSnapshot.ms,
      snapshotTraversalFps: round(sampleCount / traversalSeconds),
      budget: fixture.budgets,
      withinAdvisoryNodeBudget: analyzerMs <= fixture.budgets.analyzerMs && indexed.ms <= fixture.budgets.indexMs,
    },
  }
}

async function launchBrowser(extraArgs: string[] = []): Promise<Browser> {
  const options = { headless: true as const, args: extraArgs }
  if (process.env.REPOREWIND_BENCHMARK_BROWSER === 'chrome') {
    return chromium.launch({ ...options, channel: 'chrome' })
  }
  return chromium.launch(options)
}

async function measurePlayback(page: Page): Promise<number> {
  await page.getByRole('button', { name: /Play history|Pause history/ }).click()
  const result = await page.evaluate<number>(`new Promise((resolveFrameRate) => {
    let frames = 0;
    const started = performance.now();
    const tick = (now) => {
      frames += 1;
      if (now - started >= 2000) resolveFrameRate((frames * 1000) / (now - started));
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })`)
  const pause = page.getByRole('button', { name: /Pause history/ })
  if (await pause.isVisible()) await pause.click()
  return round(result)
}

async function measureBrowserFixture(
  browser: Browser,
  history: RepositoryHistory,
  fixture: FixtureDefinition,
  worker: boolean,
): Promise<{ measurement: BrowserMeasurement; page: Page; context: BrowserContext; session: ViewerSession }> {
  const context = await browser.newContext({
    acceptDownloads: true,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 720 },
  })
  await context.addInitScript(() => {
    const durations: number[] = []
    Object.defineProperty(globalThis, '__reporewindBenchmarkLongTasks', { configurable: true, value: durations })
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        durations.push(...list.getEntries().map((entry) => entry.duration))
      })
      observer.observe({ type: 'longtask', buffered: true })
    }
  })
  if (!worker) {
    await context.addInitScript(() => {
      Object.defineProperty(globalThis, 'Worker', { configurable: true, value: undefined })
    })
  }
  const session = await startViewerServer({ history, webRoot: resolve(repositoryRoot, 'dist') })
  const page = await context.newPage()
  const started = performance.now()
  await page.goto(session.url, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: new RegExp(`Open repository menu: local archive, ${fixture.id}`) }).waitFor({
    state: 'visible',
    timeout: 120_000,
  })
  const expectedTier = fixture.paths > 5_000 ? 'dense' : fixture.paths > 1_000 ? 'balanced' : 'cinematic'
  await page
    .locator(`.city-stage canvas[data-renderer-tier="${expectedTier}"]`)
    .waitFor({ state: 'visible', timeout: 120_000 })
  await page.evaluate(
    () => new Promise<void>((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))),
  )
  const firstInteractiveMs = round(performance.now() - started)
  const playbackFps = await measurePlayback(page)
  const responsiveness = await page.evaluate<{ count: number; max: number; total: number }>(`(() => {
    const values = globalThis.__reporewindBenchmarkLongTasks ?? [];
    return {
      count: values.length,
      max: values.length ? Math.max(...values) : 0,
      total: values.reduce((sum, value) => sum + value, 0),
    };
  })()`)
  const rendering = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.city-stage canvas')
    if (!canvas) return { webgl: 'missing', canvasPixels: '0×0', rendererTier: 'unknown' }
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return {
      webgl: gl ? `${gl.getParameter(gl.VERSION)} · ${gl.getParameter(gl.RENDERER)}` : 'unavailable',
      canvasPixels: `${canvas.width}×${canvas.height}`,
      rendererTier: canvas.dataset.rendererTier ?? 'unknown',
    }
  })
  return {
    page,
    context,
    session,
    measurement: {
      fixture: fixture.id,
      worker,
      firstInteractiveMs,
      playbackFps,
      longTasks: responsiveness.count,
      maxLongTaskMs: round(responsiveness.max),
      totalLongTaskMs: round(responsiveness.total),
      ...rendering,
      withinAdvisoryBudget: firstInteractiveMs <= fixture.budgets.firstInteractiveMs,
    },
  }
}

async function measureExport(page: Page): Promise<BrowserExportMeasurement> {
  await page.getByRole('button', { name: 'Export film', exact: true }).click()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByRole('button', { name: '12s', exact: true }).click()
  await page.getByRole('button', { name: 'WebM', exact: true }).click()
  const started = performance.now()
  const downloadPromise = page.waitForEvent('download', { timeout: 300_000 })
  await page.getByRole('button', { name: 'Build story pack', exact: true }).click()
  const download = await downloadPromise
  const temporary = resolve(tmpdir(), `reporewind-benchmark-${process.pid}-${Date.now()}.zip`)
  await download.saveAs(temporary)
  const bytes = statSync(temporary).size
  rmSync(temporary, { force: true })
  const measures = await page.evaluate(() =>
    Object.fromEntries(performance.getEntriesByType('measure').map((entry) => [entry.name, entry.duration])),
  )
  return {
    fixture: 'small',
    format: 'webm',
    durationSeconds: 12,
    width: 640,
    height: 360,
    filmMs: round(Number(measures['reporewind:film-export'] ?? 0)),
    storyPackMs: round(Number(measures['reporewind:story-pack'] ?? 0)),
    totalMs: round(performance.now() - started),
    bytes,
  }
}

async function measureNoWebgl(history: RepositoryHistory): Promise<NoWebglMeasurement> {
  const browser = await launchBrowser(['--disable-webgl', '--disable-gpu'])
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 720 },
  })
  const session = await startViewerServer({ history, webRoot: resolve(repositoryRoot, 'dist') })
  const page = await context.newPage()
  let pageError: string | undefined
  page.on('pageerror', (error) => {
    pageError ??= error.message
  })
  try {
    await page.goto(session.url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1_000)
    const fallbackVisible = await page
      .getByText('WebGL is unavailable.')
      .isVisible()
      .catch(() => false)
    const evidence = page.getByRole('region', { name: 'Repository evidence view' })

    await evidence.getByRole('button', { name: /Search archive/ }).click()
    const search = page.getByRole('combobox', { name: 'Search repository history' })
    const searchPath = [...history.commits]
      .reverse()
      .flatMap((commit) => commit.files)
      .find((change) => change.status !== 'deleted')?.path
    if (!searchPath) throw new Error('The no-WebGL fixture has no searchable file path.')
    await search.fill(`file: ${searchPath}`)
    await page.getByRole('option').first().waitFor({ state: 'visible' })
    await search.press('Enter')
    const searchUsable = await page.getByRole('region', { name: 'Selected building' }).isVisible()

    await evidence.getByRole('button', { name: /Open Insights/ }).click()
    const insightsDialog = page.getByRole('dialog', { name: 'What changed, where, and when?' })
    const insightsUsable = await insightsDialog.isVisible()
    await page.keyboard.press('Escape')

    const slider = page.getByRole('slider', { name: 'History position' })
    const initialFrame = await slider.inputValue()
    await evidence.locator('.evidence-story-list button').nth(1).click()
    const storyNavigationUsable = (await slider.inputValue()) !== initialFrame

    await evidence.getByRole('button', { name: /Pin or compare era/ }).click()
    await slider.fill(String(history.commits.length - 1))
    await evidence.getByRole('button', { name: /Pin or compare era/ }).click()
    const comparisonUsable = await page.getByRole('dialog', { name: 'Two eras. Every structural change.' }).isVisible()
    await page.keyboard.press('Escape')

    const posterDownloadPromise = page.waitForEvent('download')
    await evidence.getByRole('button', { name: /Export evidence poster/ }).click()
    const posterDownload = await posterDownloadPromise
    const posterFilename = posterDownload.suggestedFilename()
    const temporaryPoster = resolve(tmpdir(), `reporewind-evidence-${process.pid}-${Date.now()}.png`)
    await posterDownload.saveAs(temporaryPoster)
    const poster = readFileSync(temporaryPoster)
    const posterBytes = poster.length
    const isPng = poster.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const posterWidth = isPng ? poster.readUInt32BE(16) : 0
    const posterHeight = isPng ? poster.readUInt32BE(20) : 0
    rmSync(temporaryPoster, { force: true })

    await page.setViewportSize({ width: 390, height: 844 })
    const compactLayoutUsable = await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= window.innerWidth &&
        Boolean(document.querySelector('.evidence-workspace')) &&
        Boolean(document.querySelector('#timeline')),
    )

    return {
      fallbackVisible,
      searchUsable,
      insightsUsable,
      comparisonUsable,
      storyNavigationUsable,
      compactLayoutUsable,
      posterFilename,
      posterBytes,
      posterWidth,
      posterHeight,
      ...(pageError ? { pageError } : {}),
    }
  } finally {
    await context.close()
    await browser.close()
    await session.close()
  }
}

function parseOutputPath(): string {
  const outputIndex = process.argv.indexOf('--output')
  if (outputIndex >= 0 && process.argv[outputIndex + 1]) return resolve(process.argv[outputIndex + 1])
  return resolve(repositoryRoot, 'benchmark-results/benchmark.json')
}

async function main(): Promise<void> {
  const outputPath = parseOutputPath()
  const manifest = readManifest()
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'reporewind-benchmark-'))
  const nodeMeasurements: NodeMeasurement[] = []
  const histories = new Map<string, RepositoryHistory>()
  let browser: Browser | undefined
  try {
    for (const fixture of manifest.fixtures) {
      process.stdout.write(`Generating deterministic ${fixture.id} Git fixture…\n`)
      const repository = await createGitFixture(temporaryRoot, fixture)
      const result = await measureNodeFixture(repository, fixture)
      result.history.repository.name = fixture.id
      nodeMeasurements.push(result.measurement)
      histories.set(fixture.id, result.history)
      process.stdout.write(
        `${fixture.id}: ${result.measurement.commits.toLocaleString()} commits analyzed in ${result.measurement.analyzerMs.toLocaleString()} ms\n`,
      )
    }

    browser = await launchBrowser()
    const workerMeasurements: BrowserMeasurement[] = []
    let exportMeasurement: BrowserExportMeasurement | undefined
    for (const fixture of manifest.fixtures) {
      process.stdout.write(`Measuring ${fixture.id} in Chromium with a worker…\n`)
      const run = await measureBrowserFixture(browser, histories.get(fixture.id)!, fixture, true)
      try {
        workerMeasurements.push(run.measurement)
        if (fixture.id === 'small') {
          process.stdout.write('Measuring deterministic 12-second WebM preview story-pack export…\n')
          exportMeasurement = await measureExport(run.page)
        }
      } finally {
        await run.context.close()
        await run.session.close()
      }
    }
    if (!exportMeasurement) throw new Error('The small browser export fixture did not run.')

    const largeFixture = manifest.fixtures.find((fixture) => fixture.id === 'large')!
    process.stdout.write('Measuring the large fixture without a Worker…\n')
    const noWorkerRun = await measureBrowserFixture(browser, histories.get('large')!, largeFixture, false)
    await noWorkerRun.context.close()
    await noWorkerRun.session.close()
    process.stdout.write('Measuring the useful non-WebGL evidence mode…\n')
    const noWebgl = await measureNoWebgl(histories.get('small')!)

    const browserVersion = await browser.version()
    const packageMetadata = JSON.parse(readFileSync(packagePath, 'utf8')) as { version: string }
    const result: BenchmarkResult = {
      schemaVersion: 1,
      fixtureVersion: manifest.fixtureVersion,
      repoRewindVersion: packageMetadata.version,
      generatedAt: new Date().toISOString(),
      advisoryOnly: true,
      environment: {
        platform: process.platform,
        release: os.release(),
        architecture: process.arch,
        cpu: os.cpus()[0]?.model ?? 'unknown',
        cpuCount: os.cpus().length,
        memoryGiB: round(os.totalmem() / 1024 ** 3, 1),
        node: process.version,
        git: commandVersion('git', ['--version']),
        browser: browserVersion,
        deviceScaleFactor: 2,
        headless: true,
      },
      node: nodeMeasurements,
      browser: {
        workers: workerMeasurements,
        noWorker: noWorkerRun.measurement,
        noWebgl,
        export: exportMeasurement,
      },
    }
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)
    process.stdout.write(`Benchmark result written to ${outputPath}\n`)
  } finally {
    await browser?.close().catch(() => undefined)
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`)
  process.exitCode = 1
})
