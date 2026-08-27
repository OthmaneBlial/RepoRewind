import { execFile } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: projectRoot,
  maxBuffer: 10 * 1024 * 1024,
})
const [pack] = JSON.parse(stdout)
if (!pack || !Array.isArray(pack.files)) throw new Error('npm pack did not return a file manifest.')

const paths = pack.files.map((file) => file.path)
const required = [
  'LICENSE',
  'README.md',
  'THIRD_PARTY_NOTICES.md',
  'dist-cli/index.js',
  'dist/index.html',
  'package.json',
  'schema/reporewind-history.schema.json',
]
const failures = required.filter((path) => !paths.includes(path)).map((path) => `Missing package file: ${path}`)
const forbidden = paths.filter(
  (path) =>
    path.endsWith('.map') ||
    path.startsWith('.env') ||
    path.startsWith('artifacts/') ||
    path.startsWith('cli/') ||
    path.startsWith('research_') ||
    path.startsWith('scripts/') ||
    path.startsWith('site/') ||
    path.startsWith('src/'),
)
forbidden.forEach((path) => failures.push(`Forbidden package file: ${path}`))

const executable = pack.files.find((file) => file.path === 'dist-cli/index.js')
if (process.platform !== 'win32' && executable?.mode !== 0o755) {
  failures.push('dist-cli/index.js is not executable in the npm package.')
}
if (pack.unpackedSize > 5 * 1024 * 1024) failures.push('The unpacked npm package exceeds the 5 MB budget.')

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(
    `Checked ${paths.length} npm package files (${Math.round(pack.size / 1024).toLocaleString()} kB tarball, ${Math.round(pack.unpackedSize / 1024).toLocaleString()} kB unpacked).\n`,
  )
}
