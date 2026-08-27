import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(await readFile(resolve(root, 'benchmarks/fixtures/v1.json'), 'utf8'))
const fixtureById = new Map(manifest.fixtures.map((fixture) => [fixture.id, fixture]))
const resultDirectory = resolve(root, 'benchmarks/results')
const resultFiles = (await readdir(resultDirectory)).filter((filename) => filename.endsWith('.json')).sort()
const failures = []

if (manifest.schemaVersion !== 1 || manifest.fixtureVersion !== 'v1' || fixtureById.size !== 3) {
  failures.push('benchmarks/fixtures/v1.json does not define the expected versioned small/medium/large contract.')
}
if (resultFiles.length === 0) failures.push('No versioned benchmark result is checked in.')

const finiteNonnegative = (value) => Number.isFinite(value) && value >= 0

for (const filename of resultFiles) {
  const result = JSON.parse(await readFile(resolve(resultDirectory, filename), 'utf8'))
  if (result.schemaVersion !== 1 || result.fixtureVersion !== manifest.fixtureVersion || result.advisoryOnly !== true) {
    failures.push(`${filename}: result metadata does not match the v1 advisory contract.`)
    continue
  }
  if (
    !result.environment?.cpu ||
    !result.environment?.node ||
    !result.environment?.browser ||
    result.environment?.deviceScaleFactor !== 2
  ) {
    failures.push(`${filename}: hardware and runtime metadata are incomplete.`)
  }
  if (!Array.isArray(result.node) || result.node.length !== fixtureById.size) {
    failures.push(`${filename}: expected one Node measurement for every fixture.`)
  } else {
    for (const measurement of result.node) {
      const fixture = fixtureById.get(measurement.fixture)
      if (!fixture) {
        failures.push(`${filename}: unknown fixture ${measurement.fixture}.`)
        continue
      }
      if (
        measurement.commits !== fixture.commits ||
        measurement.fileChanges !== fixture.commits * fixture.changesPerCommit ||
        measurement.finalPaths !== fixture.paths ||
        measurement.contributors !== fixture.contributors ||
        measurement.releases !== fixture.releases
      ) {
        failures.push(`${filename}: ${measurement.fixture} fixture counts drifted from the manifest.`)
      }
      for (const field of [
        'archiveBytes',
        'analyzerMs',
        'analyzerPeakRssDeltaMiB',
        'analyzerPeakHeapDeltaMiB',
        'parseMs',
        'validationMs',
        'indexMs',
        'layoutMs',
        'firstSnapshotMs',
        'snapshotTraversalFps',
      ]) {
        if (!finiteNonnegative(measurement[field]))
          failures.push(`${filename}: invalid ${measurement.fixture}.${field}.`)
      }
      const expectedBudgetState =
        measurement.analyzerMs <= fixture.budgets.analyzerMs && measurement.indexMs <= fixture.budgets.indexMs
      if (measurement.withinAdvisoryNodeBudget !== expectedBudgetState) {
        failures.push(`${filename}: ${measurement.fixture} Node budget status is inconsistent.`)
      }
    }
  }
  if (!Array.isArray(result.browser?.workers) || result.browser.workers.length !== fixtureById.size) {
    failures.push(`${filename}: expected worker-enabled browser measurements for all fixtures.`)
  } else {
    for (const measurement of result.browser.workers) {
      const fixture = fixtureById.get(measurement.fixture)
      if (!fixture || measurement.worker !== true) {
        failures.push(`${filename}: invalid worker measurement for ${measurement.fixture}.`)
        continue
      }
      for (const field of ['firstInteractiveMs', 'playbackFps', 'longTasks', 'maxLongTaskMs', 'totalLongTaskMs']) {
        if (!finiteNonnegative(measurement[field]))
          failures.push(`${filename}: invalid ${measurement.fixture}.${field}.`)
      }
      if (!['cinematic', 'balanced', 'dense'].includes(measurement.rendererTier)) {
        failures.push(`${filename}: invalid ${measurement.fixture} renderer tier.`)
      }
      if (measurement.withinAdvisoryBudget !== measurement.firstInteractiveMs <= fixture.budgets.firstInteractiveMs) {
        failures.push(`${filename}: ${measurement.fixture} browser budget status is inconsistent.`)
      }
    }
  }
  if (result.browser?.noWorker?.worker !== false || result.browser?.noWorker?.fixture !== 'large') {
    failures.push(`${filename}: the no-worker large-history measurement is missing.`)
  }
  if (
    typeof result.browser?.noWebgl?.fallbackVisible !== 'boolean' ||
    typeof result.browser?.noWebgl?.searchUsable !== 'boolean' ||
    typeof result.browser?.noWebgl?.insightsUsable !== 'boolean' ||
    typeof result.browser?.noWebgl?.comparisonUsable !== 'boolean' ||
    typeof result.browser?.noWebgl?.storyNavigationUsable !== 'boolean' ||
    typeof result.browser?.noWebgl?.compactLayoutUsable !== 'boolean' ||
    typeof result.browser?.noWebgl?.posterFilename !== 'string' ||
    !finiteNonnegative(result.browser?.noWebgl?.posterBytes) ||
    !finiteNonnegative(result.browser?.noWebgl?.posterWidth) ||
    !finiteNonnegative(result.browser?.noWebgl?.posterHeight)
  ) {
    failures.push(`${filename}: the no-WebGL observation is missing.`)
  }
  for (const field of ['filmMs', 'storyPackMs', 'totalMs', 'bytes']) {
    if (!finiteNonnegative(result.browser?.export?.[field])) failures.push(`${filename}: invalid export.${field}.`)
  }
  if (result.browser?.export?.width !== 640 || result.browser?.export?.height !== 360) {
    failures.push(`${filename}: the deterministic preview export must be 640x360.`)
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(
    `Checked ${resultFiles.length} benchmark result against fixture contract ${manifest.fixtureVersion}.\n`,
  )
}
