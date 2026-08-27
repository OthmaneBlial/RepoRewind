import packageMetadata from '../../package.json'
import type { Commit, RepositoryHistory } from './types'

export type SharePreset = 'public' | 'private'
export type PathDisclosure = 'hidden' | 'extension' | 'basename' | 'full'
export type DateDisclosure = 'year' | 'month' | 'exact'

export interface SharePrivacySettings {
  preset: SharePreset
  repositoryName: boolean
  contributorNames: boolean
  commitMessages: boolean
  commitHashes: boolean
  pathDisclosure: PathDisclosure
  refNames: boolean
  dateDisclosure: DateDisclosure
  aggregates: boolean
  attribution: boolean
  includeEmails: boolean
}

export interface PrivacyReport {
  reportVersion: 1
  repoRewindVersion: string
  schemaVersion: 1
  preset: SharePreset
  refScope: 'branch' | 'all-branches'
  historyCompleteness: 'complete' | 'partial'
  archiveBytes: number
  disclosure: SharePrivacySettings
  includedFields: string[]
  omittedFields: string[]
  warnings: string[]
}

export const publicShareSettings: SharePrivacySettings = {
  preset: 'public',
  repositoryName: false,
  contributorNames: false,
  commitMessages: false,
  commitHashes: false,
  pathDisclosure: 'hidden',
  refNames: false,
  dateDisclosure: 'month',
  aggregates: true,
  attribution: true,
  includeEmails: false,
}

export const privateShareSettings: SharePrivacySettings = {
  preset: 'private',
  repositoryName: true,
  contributorNames: true,
  commitMessages: true,
  commitHashes: true,
  pathDisclosure: 'full',
  refNames: true,
  dateDisclosure: 'exact',
  aggregates: true,
  attribution: true,
  includeEmails: false,
}

export function shareSettingsForPreset(preset: SharePreset): SharePrivacySettings {
  return { ...(preset === 'public' ? publicShareSettings : privateShareSettings) }
}

export function historyContainsEmails(history: RepositoryHistory): boolean {
  return history.contributors.some((contributor) => Boolean(contributor.email))
}

export function sensitivePublicFields(settings: SharePrivacySettings): string[] {
  if (settings.preset !== 'public') return []
  return [
    ...(settings.repositoryName ? ['repository name'] : []),
    ...(settings.contributorNames ? ['contributor names'] : []),
    ...(settings.commitMessages ? ['commit messages'] : []),
    ...(settings.commitHashes ? ['commit hashes'] : []),
    ...(settings.pathDisclosure === 'basename' ? ['file basenames'] : []),
    ...(settings.pathDisclosure === 'full' ? ['full file paths'] : []),
    ...(settings.refNames ? ['branch and release names'] : []),
    ...(settings.dateDisclosure === 'exact' ? ['exact dates'] : []),
    ...(settings.includeEmails ? ['contributor emails'] : []),
  ]
}

export function displayRepositoryName(history: RepositoryHistory, settings: SharePrivacySettings): string {
  return settings.repositoryName ? history.repository.name : 'Repository history'
}

export function displayCommitMessage(commit: Commit, index: number, settings: SharePrivacySettings): string {
  return settings.commitMessages ? commit.message : `Repository change ${String(index + 1).padStart(2, '0')}`
}

export function displayCommitHash(commit: Commit, index: number, settings: SharePrivacySettings): string | undefined {
  return settings.commitHashes ? commit.hash : settings.preset === 'private' ? `commit-${index + 1}` : undefined
}

export function displayContributorName(
  history: RepositoryHistory,
  authorId: string,
  settings: SharePrivacySettings,
): string {
  const index = Math.max(
    0,
    history.contributors.findIndex((contributor) => contributor.id === authorId),
  )
  if (!settings.contributorNames) return `Traveler ${String(index + 1).padStart(2, '0')}`
  return history.contributors[index]?.name ?? 'Unknown contributor'
}

export function displayPath(path: string, settings: SharePrivacySettings): string | undefined {
  if (settings.pathDisclosure === 'hidden') return undefined
  const basename = path.split('/').filter(Boolean).at(-1) ?? path
  if (settings.pathDisclosure === 'full') return path
  if (settings.pathDisclosure === 'basename') return basename
  const extension = basename.includes('.') ? `.${basename.split('.').at(-1)}` : 'extensionless'
  return `${extension} file`
}

export function displayRef(name: string, index: number, settings: SharePrivacySettings): string {
  return settings.refNames ? name : `Landmark ${String(index + 1).padStart(2, '0')}`
}

export function displayDate(date: string, settings: SharePrivacySettings): string {
  const options: Intl.DateTimeFormatOptions =
    settings.dateDisclosure === 'exact'
      ? { day: '2-digit', month: 'short', year: 'numeric' }
      : settings.dateDisclosure === 'month'
        ? { month: 'short', year: 'numeric' }
        : { year: 'numeric' }
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(new Date(date))
}

export function buildPrivacyReport(history: RepositoryHistory, settings: SharePrivacySettings): PrivacyReport {
  const includedFields = [
    settings.repositoryName ? 'repository.name' : 'repository.genericLabel',
    settings.contributorNames ? 'contributors.name' : 'contributors.pseudonym',
    ...(settings.includeEmails ? ['contributors.email'] : []),
    settings.commitMessages ? 'commits.message' : 'commits.genericLabel',
    ...(settings.commitHashes ? ['commits.hash'] : []),
    ...(settings.pathDisclosure !== 'hidden' ? [`files.path:${settings.pathDisclosure}`] : []),
    ...(settings.refNames ? ['branches.name', 'releases.tag'] : ['refs.genericLabel']),
    `dates:${settings.dateDisclosure}`,
    ...(settings.aggregates ? ['aggregates'] : []),
    ...(settings.attribution ? ['product.attribution', 'product.link'] : []),
  ]
  const omittedFields = [
    ...(!settings.repositoryName ? ['repository.name', 'repository.remote'] : ['repository.remote']),
    ...(!settings.contributorNames ? ['contributors.name'] : []),
    ...(!settings.includeEmails ? ['contributors.email'] : []),
    ...(!settings.commitMessages ? ['commits.message'] : []),
    ...(!settings.commitHashes ? ['commits.hash', 'commits.parents'] : []),
    ...(settings.pathDisclosure === 'hidden' ? ['files.path', 'files.previousPath'] : []),
    ...(!settings.refNames ? ['commits.refs', 'branches.name', 'releases.tag'] : []),
    ...(!settings.aggregates ? ['aggregates'] : []),
    ...(!settings.attribution ? ['product.attribution', 'product.link'] : []),
  ]
  const warnings = [
    ...(history.repository.truncated ? ['The archive is partial history.'] : []),
    ...(historyContainsEmails(history)
      ? [
          settings.includeEmails
            ? 'Contributor emails are included by explicit override.'
            : 'Contributor emails exist in the canonical archive and are omitted from this presentation.',
        ]
      : []),
    ...sensitivePublicFields(settings).map((field) => `Public presentation includes ${field}.`),
  ]
  return {
    reportVersion: 1,
    repoRewindVersion: packageMetadata.version,
    schemaVersion: history.schemaVersion,
    preset: settings.preset,
    refScope: history.repository.scope ?? 'branch',
    historyCompleteness: history.repository.truncated ? 'partial' : 'complete',
    archiveBytes: new TextEncoder().encode(JSON.stringify(history)).byteLength,
    disclosure: { ...settings },
    includedFields,
    omittedFields,
    warnings,
  }
}

export function privacyReportJson(history: RepositoryHistory, settings: SharePrivacySettings): string {
  return `${JSON.stringify(buildPrivacyReport(history, settings), null, 2)}\n`
}
