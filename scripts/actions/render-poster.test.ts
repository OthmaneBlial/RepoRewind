import { describe, expect, it } from 'vitest'
import { sampleHistory } from '../../src/data/sample-history'
import { buildActionManifest } from './render-poster'

describe('poster Action manifest', () => {
  it('records a private short-retention artifact without archive identifiers', () => {
    const privateHistory = {
      ...sampleHistory,
      repository: {
        ...sampleHistory.repository,
        name: 'confidential-repository-name',
        remote: 'https://github.com/example/confidential-repository-name.git',
      },
    }
    const manifest = buildActionManifest(
      privateHistory,
      [{ filename: 'repo-rewind-evidence-poster.png', bytes: 123, sha256: 'a'.repeat(64) }],
      3,
      'private',
    )
    const serialized = JSON.stringify(manifest)

    expect(manifest.publication).toEqual({
      mode: 'private-actions-artifact-only',
      published: false,
      retentionDays: 3,
    })
    expect(manifest.generator.deterministicRenderCheck).toBe('passed')
    expect(serialized).not.toContain(privateHistory.repository.name)
    expect(serialized).not.toContain(privateHistory.repository.remote)
    expect(serialized).not.toContain(sampleHistory.commits[0].message)
    expect(serialized).not.toContain(sampleHistory.commits[0].files[0].path)
  })
})
