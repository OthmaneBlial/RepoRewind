import { describe, expect, it } from 'vitest'
import { sampleHistory } from '../data/sample-history'
import {
  buildPrivacyReport,
  displayCommitHash,
  displayCommitMessage,
  displayContributorName,
  displayDate,
  displayPath,
  displayRef,
  displayRepositoryName,
  historyContainsEmails,
  privateShareSettings,
  privacyReportJson,
  publicShareSettings,
  sensitivePublicFields,
} from './privacy'

describe('share-safety projection', () => {
  it('omits identifying fields from the public preset without changing the canonical archive', () => {
    const canonical = structuredClone(sampleHistory)
    const commit = sampleHistory.commits[2]

    expect(displayRepositoryName(sampleHistory, publicShareSettings)).toBe('Repository history')
    expect(displayContributorName(sampleHistory, commit.authorId, publicShareSettings)).toMatch(/^Traveler \d{2}$/)
    expect(displayCommitMessage(commit, 2, publicShareSettings)).toBe('Repository change 03')
    expect(displayCommitHash(commit, 2, publicShareSettings)).toBeUndefined()
    expect(displayPath('src/private/report.ts', publicShareSettings)).toBeUndefined()
    expect(displayRef('release/secret', 1, publicShareSettings)).toBe('Landmark 02')
    expect(displayDate('2026-08-27T12:34:56.000Z', publicShareSettings)).toBe('Aug 2026')
    expect(sampleHistory).toEqual(canonical)
  })

  it('projects private-review fields and every documented path disclosure deterministically', () => {
    const commit = sampleHistory.commits[2]
    expect(displayRepositoryName(sampleHistory, privateShareSettings)).toBe(sampleHistory.repository.name)
    expect(displayCommitMessage(commit, 2, privateShareSettings)).toBe(commit.message)
    expect(displayCommitHash(commit, 2, privateShareSettings)).toBe(commit.hash)
    expect(displayPath('src/private/report.ts', { ...privateShareSettings, pathDisclosure: 'full' })).toBe(
      'src/private/report.ts',
    )
    expect(displayPath('src/private/report.ts', { ...privateShareSettings, pathDisclosure: 'basename' })).toBe(
      'report.ts',
    )
    expect(displayPath('src/private/report.ts', { ...privateShareSettings, pathDisclosure: 'extension' })).toBe(
      '.ts file',
    )
    expect(displayDate('2026-08-27T12:34:56.000Z', privateShareSettings)).toBe('Aug 27, 2026')
  })

  it('records included, omitted, scope, completeness, size, version, and email warnings', () => {
    const history = structuredClone(sampleHistory)
    history.repository.truncated = true
    history.contributors[0].email = 'private@example.test'
    const report = buildPrivacyReport(history, publicShareSettings)

    expect(historyContainsEmails(history)).toBe(true)
    expect(report).toMatchObject({
      reportVersion: 1,
      repoRewindVersion: '0.2.0',
      schemaVersion: 1,
      preset: 'public',
      refScope: 'branch',
      historyCompleteness: 'partial',
    })
    expect(report.archiveBytes).toBeGreaterThan(1_000)
    expect(report.includedFields).toContain('aggregates')
    expect(report.omittedFields).toEqual(
      expect.arrayContaining(['repository.remote', 'contributors.email', 'files.path']),
    )
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        'The archive is partial history.',
        'Contributor emails exist in the canonical archive and are omitted from this presentation.',
      ]),
    )
    expect(JSON.parse(privacyReportJson(history, publicShareSettings))).toEqual(report)
  })

  it('requires a second review when a public projection includes sensitive fields', () => {
    expect(sensitivePublicFields(publicShareSettings)).toEqual([])
    expect(
      sensitivePublicFields({
        ...publicShareSettings,
        repositoryName: true,
        commitMessages: true,
        pathDisclosure: 'basename',
      }),
    ).toEqual(['repository name', 'commit messages', 'file basenames'])
  })

  it('records reviewed Story Director fields without embedding chapter content', () => {
    const report = buildPrivacyReport(sampleHistory, publicShareSettings, {
      storyChapterCount: 4,
      customStoryTitles: true,
    })

    expect(report.story).toEqual({ chapterCount: 4, customTitles: true })
    expect(report.includedFields).toEqual(expect.arrayContaining(['story.chapterTitles', 'story.commitRanges']))
    expect(report.warnings).toContain('Public presentation includes reviewed custom story chapter titles.')
    expect(JSON.stringify(report)).not.toContain('My private chapter title')
  })
})
