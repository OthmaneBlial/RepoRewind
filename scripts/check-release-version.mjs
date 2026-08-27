import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const packageJson = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'))
const changelog = await readFile(resolve(projectRoot, 'CHANGELOG.md'), 'utf8')
const releaseTag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME
const version = packageJson.version

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Public releases require a stable semantic version; received ${String(version)}.`)
}
if (!releaseTag) throw new Error('Set RELEASE_TAG (or GITHUB_REF_NAME) to the exact release tag.')
if (releaseTag !== `v${version}`) {
  throw new Error(`Release tag ${releaseTag} does not match package version ${version}.`)
}
if (!changelog.includes(`## [${version}] - `)) {
  throw new Error(`CHANGELOG.md does not contain a dated ${version} release section.`)
}

process.stdout.write(`Release contract verified for ${releaseTag}.\n`)
