import { cp, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const showcaseRoot = join(projectRoot, 'site')
const applicationRoot = join(projectRoot, 'dist')
const replayProof = join(projectRoot, 'docs', 'assets', 'repo-rewind-replay.gif')
const outputRoot = join(projectRoot, '.pages-site')
const playgroundRoot = join(outputRoot, 'play')

await rm(outputRoot, { recursive: true, force: true })
await mkdir(outputRoot, { recursive: true })
await cp(showcaseRoot, outputRoot, { recursive: true })
await cp(replayProof, join(outputRoot, 'assets', 'repo-rewind-replay.gif'))
await cp(applicationRoot, playgroundRoot, { recursive: true })

process.stdout.write(`Bundled showcase and interactive playground in ${outputRoot}.\n`)
