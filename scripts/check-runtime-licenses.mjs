import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const dependencyTree = JSON.parse(
  execFileSync(npmExecutable, ['ls', '--omit=dev', '--all', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
)
const notices = readFileSync(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8')
const runtimePackages = new Map()

function collect(dependencies = {}) {
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (!dependency.version) continue
    if (!name.startsWith('@types/') && name !== 'csstype') {
      runtimePackages.set(name, dependency.version)
    }
    collect(dependency.dependencies)
  }
}

collect(dependencyTree.dependencies)

const escapeRegularExpression = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const missing = Array.from(runtimePackages, ([name, version]) => ({ name, version })).filter(
  ({ name, version }) =>
    !notices.includes(`\`${name}\``) || !new RegExp(`\\|\\s*${escapeRegularExpression(version)}\\s*\\|`).test(notices),
)

if (missing.length > 0) {
  const packages = missing.map(({ name, version }) => `${name}@${version}`).join(', ')
  throw new Error(`THIRD_PARTY_NOTICES.md is missing locked runtime packages: ${packages}`)
}

process.stdout.write(`Checked notices for ${runtimePackages.size} locked runtime packages.\n`)
