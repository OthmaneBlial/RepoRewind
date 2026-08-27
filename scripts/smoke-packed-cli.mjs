import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const temporaryRoot = await mkdtemp(join(tmpdir(), 'reporewind-package-smoke-'))
const packRoot = join(temporaryRoot, 'pack')
const installRoot = join(temporaryRoot, 'install')
let viewerProcess

function runNpm(args, options = {}) {
  const npmCli = process.env.npm_execpath
  return npmCli
    ? run(process.execPath, [npmCli, ...args], options)
    : run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, options)
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', rejectRun)
    child.on('close', (code, signal) => {
      if (code === 0) resolveRun({ code, signal, stdout, stderr })
      else rejectRun(new Error(`${command} ${args.join(' ')} failed (${code ?? signal}).\n${stderr || stdout}`))
    })
  })
}

async function waitForViewer(child) {
  let stdout = ''
  let stderr = ''
  return new Promise((resolveViewer, rejectViewer) => {
    const timeout = setTimeout(
      () => rejectViewer(new Error(`Timed out waiting for packed viewer.\n${stderr || stdout}`)),
      30_000,
    )
    const inspect = () => {
      const match = stdout.match(/Local viewer: (http:\/\/127\.0\.0\.1:\d+\/[A-Za-z0-9_-]+\/)/)
      if (!match) return
      clearTimeout(timeout)
      resolveViewer({ stdout, url: match[1] })
    }
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
      inspect()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      rejectViewer(error)
    })
    child.on('close', (code, signal) => {
      clearTimeout(timeout)
      rejectViewer(new Error(`Packed viewer exited before it was ready (${code ?? signal}).\n${stderr || stdout}`))
    })
  })
}

try {
  await mkdir(packRoot)
  await mkdir(installRoot)
  await writeFile(join(installRoot, 'package.json'), '{"name":"reporewind-smoke","private":true}\n')

  const packed = await runNpm(['pack', '--json', '--ignore-scripts', '--pack-destination', packRoot], {
    cwd: projectRoot,
  })
  const [pack] = JSON.parse(packed.stdout)
  const tarball = join(packRoot, pack.filename)
  await runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], { cwd: installRoot })

  const cli = join(installRoot, 'node_modules', 'reporewind', 'dist-cli', 'index.js')
  const version = await run(process.execPath, [cli, '--version'], { cwd: installRoot })
  if (version.stdout.trim() !== pack.version) throw new Error('Packed CLI version does not match its package version.')

  const archive = await run(process.execPath, [cli, 'analyze', projectRoot, '--stdout', '--max-commits', '5'], {
    cwd: installRoot,
  })
  const history = JSON.parse(archive.stdout)
  if (history.repository.name !== 'RepoRewind' || history.commits.length !== 5) {
    throw new Error('Packed CLI did not analyze the fixture repository correctly.')
  }

  viewerProcess = spawn(process.execPath, [cli, projectRoot, '--no-open', '--max-commits', '5'], {
    cwd: installRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const viewer = await waitForViewer(viewerProcess)
  const index = await fetch(viewer.url)
  if (!index.ok || !(await index.text()).includes('content="./history.json"')) {
    throw new Error('Packed viewer did not serve its bootstrap document.')
  }
  const historyResponse = await fetch(new URL('history.json', viewer.url))
  const viewerHistory = await historyResponse.json()
  if (!historyResponse.ok || viewerHistory.commits.length !== 5) {
    throw new Error('Packed viewer did not serve the analyzed history.')
  }

  process.stdout.write(
    `Smoke-tested ${pack.id} from its exact ${Math.round(pack.size / 1024).toLocaleString()} kB tarball: version, archive, loopback viewer, and shutdown.\n`,
  )
} finally {
  if (viewerProcess && viewerProcess.exitCode === null) {
    viewerProcess.kill('SIGTERM')
    await new Promise((resolveExit) => {
      const timeout = setTimeout(resolveExit, 5_000)
      viewerProcess.once('close', () => {
        clearTimeout(timeout)
        resolveExit()
      })
    })
  }
  await rm(temporaryRoot, { recursive: true, force: true })
}
