// @vitest-environment node

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { sampleHistory } from '../src/data/sample-history'
import { startViewerServer, type ViewerSession } from './viewer-server'

const temporaryDirectories: string[] = []
const sessions: ViewerSession[] = []

afterEach(async () => {
  await Promise.all(sessions.splice(0).map((session) => session.close()))
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function fixtureWebRoot(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'reporewind-viewer-'))
  temporaryDirectories.push(directory)
  await writeFile(
    join(directory, 'index.html'),
    '<!doctype html><meta name="reporewind-archive" content="" /><main id="root"></main>',
  )
  await writeFile(join(directory, 'app.js'), 'document.documentElement.dataset.ready = "true"\n')
  return directory
}

describe('local viewer server', () => {
  it('serves one tokenized, read-only, security-hardened session', async () => {
    const session = await startViewerServer({ history: sampleHistory, webRoot: await fixtureWebRoot() })
    sessions.push(session)
    const sessionUrl = new URL(session.url)

    expect(sessionUrl.hostname).toBe('127.0.0.1')
    expect(sessionUrl.pathname).toMatch(/^\/[A-Za-z0-9_-]{32}\/$/)

    const index = await fetch(session.url)
    expect(index.status).toBe(200)
    expect(index.headers.get('cache-control')).toBe('no-store')
    expect(index.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(index.headers.get('cross-origin-resource-policy')).toBe('same-origin')
    expect(await index.text()).toContain('content="./history.json"')

    const history = await fetch(new URL('history.json', session.url))
    expect(history.status).toBe(200)
    expect(history.headers.get('cache-control')).toBe('no-store')
    expect(await history.json()).toMatchObject({ repository: { name: sampleHistory.repository.name } })

    const asset = await fetch(new URL('app.js', session.url))
    expect(asset.status).toBe(200)
    expect(asset.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
    expect(await asset.text()).toContain('dataset.ready')

    const outsideSession = await fetch(new URL('/app.js', session.url))
    expect(outsideSession.status).toBe(404)
    const mutation = await fetch(session.url, { method: 'POST' })
    expect(mutation.status).toBe(405)
    expect(mutation.headers.get('allow')).toBe('GET, HEAD')
  })

  it('supports HEAD requests without returning archive data', async () => {
    const session = await startViewerServer({ history: sampleHistory, webRoot: await fixtureWebRoot() })
    sessions.push(session)

    const response = await fetch(new URL('history.json', session.url), { method: 'HEAD' })
    expect(response.status).toBe(200)
    expect(Number(response.headers.get('content-length'))).toBeGreaterThan(1_000)
    expect(await response.text()).toBe('')
  })
})
