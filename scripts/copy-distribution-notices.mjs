import { copyFileSync, mkdirSync } from 'node:fs'

const projectRoot = new URL('../', import.meta.url)
const distributionRoot = new URL('../dist/', import.meta.url)

mkdirSync(distributionRoot, { recursive: true })
for (const filename of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  copyFileSync(new URL(filename, projectRoot), new URL(filename, distributionRoot))
}

process.stdout.write('Copied LICENSE and THIRD_PARTY_NOTICES.md into dist/.\n')
