import { describe, expect, it } from 'vitest'
import { HistoryEngine } from '../core/history'
import { publicShareSettings } from '../core/privacy'
import { sampleHistory } from '../data/sample-history'
import {
  buildStoryPackManifest,
  buildStoryPackMarkdown,
  createStoredZip,
  STORY_PACK_DIMENSIONS,
  STORY_PACK_FILENAMES,
  storyPackAltText,
} from './story-pack'

describe('history story pack', () => {
  it('uses documented dimensions and stable filenames', () => {
    expect(STORY_PACK_DIMENSIONS).toEqual({
      socialCard: { width: 1200, height: 630 },
      squarePoster: { width: 1080, height: 1080 },
      widescreenPoster: { width: 1920, height: 1080 },
      currentFrame: { width: 1600, height: 900 },
    })
    expect(STORY_PACK_FILENAMES).toMatchInlineSnapshot(`
      {
        "archive": "repo-rewind-story-pack.zip",
        "currentFrame": "repo-rewind-current-frame.png",
        "manifest": "manifest.json",
        "markdown": "README-snippet.md",
        "privacyReport": "privacy-report.json",
        "socialCard": "repo-rewind-social-card.png",
        "squarePoster": "repo-rewind-square-poster.png",
        "widescreenPoster": "repo-rewind-widescreen-poster.png",
      }
    `)
  })

  it('creates public-safe, README-ready Markdown with useful alt text', () => {
    const markdown = buildStoryPackMarkdown(sampleHistory, publicShareSettings, 'webm')

    expect(storyPackAltText(sampleHistory, publicShareSettings)).toBe(
      'RepoRewind visual Git history of a repository, from Apr 2016 to May 2026 across 25 commits, shown as a cinematic software city.',
    )
    expect(markdown).toContain('<img src="./repo-rewind-social-card.png"')
    expect(markdown).toContain('[Watch the RepoRewind trailer](./repo-rewind-trailer.webm)')
    expect(markdown).toContain('https://othmaneblial.github.io/RepoRewind/play/')
    expect(markdown).toContain('repository data was not uploaded')
    expect(storyPackAltText(sampleHistory, publicShareSettings)).not.toContain(sampleHistory.repository.name)
    expect(storyPackAltText(sampleHistory, publicShareSettings)).not.toContain(sampleHistory.repository.branch)
  })

  it('records privacy-projected selection and SHA-256 for every artifact', async () => {
    const manifest = await buildStoryPackManifest(
      sampleHistory,
      new HistoryEngine(sampleHistory).snapshotAt(12),
      publicShareSettings,
      [{ filename: 'proof.txt', mediaType: 'text/plain', bytes: new TextEncoder().encode('hello') }],
    )

    expect(manifest).toMatchObject({
      packVersion: 1,
      repoRewindVersion: '0.2.0',
      schemaVersion: 1,
      preset: 'public',
      selection: {
        ref: 'Landmark 01',
        scope: 'branch',
        range: { from: 'Apr 2016', to: 'May 2026' },
        frame: 13,
        historyCompleteness: 'complete',
      },
    })
    expect(manifest.includedFields).toContain('product.attribution')
    expect(manifest.omittedFields).toEqual(expect.arrayContaining(['repository.name', 'files.path', 'commits.hash']))
    expect(manifest.artifacts).toEqual([
      {
        filename: 'proof.txt',
        mediaType: 'text/plain',
        bytes: 5,
        sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      },
    ])
  })

  it('writes a deterministic stored ZIP and rejects path-bearing names', async () => {
    const zip = createStoredZip([
      { filename: 'proof.txt', bytes: new TextEncoder().encode('hello') },
      { filename: 'manifest.json', bytes: new TextEncoder().encode('{}\n') },
    ])
    const bytes = new Uint8Array(await zip.arrayBuffer())
    const view = new DataView(bytes.buffer)
    const text = new TextDecoder().decode(bytes)

    expect(zip.type).toBe('application/zip')
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50)
    expect(text).toContain('proof.txt')
    expect(text).toContain('manifest.json')
    expect(() => createStoredZip([{ filename: '../history.json', bytes: new Uint8Array() }])).toThrow(
      'Unsafe story-pack filename',
    )
  })
})
