import type { ChangeStatus, Commit, Contributor, FileChange, RepositoryHistory } from '../core/types'

const people: Contributor[] = [
  { id: 'maya', name: 'Maya Chen', color: '#ffb45c', commits: 7, additions: 1940, deletions: 412 },
  { id: 'idriss', name: 'Idriss Bell', color: '#63d8bd', commits: 6, additions: 1260, deletions: 380 },
  { id: 'sofia', name: 'Sofia Rossi', color: '#ed6f5d', commits: 5, additions: 880, deletions: 205 },
  { id: 'noah', name: 'Noah Williams', color: '#82aaff', commits: 4, additions: 640, deletions: 110 },
  { id: 'aki', name: 'Aki Tanaka', color: '#db91ff', commits: 3, additions: 520, deletions: 240 },
]

const file = (path: string, additions: number, deletions = 0, status: ChangeStatus = 'modified', previousPath?: string): FileChange => ({
  path, additions, deletions, status, previousPath,
})

const rawCommits: Array<[string, string, string, FileChange[]]> = [
  ['2016-04-18T09:12:00Z', 'maya', 'Plant the first seed', [file('README.md', 48, 0, 'added'), file('src/index.ts', 96, 0, 'added'), file('package.json', 31, 0, 'added')]],
  ['2016-08-02T15:30:00Z', 'maya', 'Add the parsing engine', [file('src/parser/git.ts', 188, 0, 'added'), file('src/index.ts', 28, 8)]],
  ['2017-01-20T11:04:00Z', 'idriss', 'Render the first city blocks', [file('src/renderer/city.ts', 246, 0, 'added'), file('src/renderer/materials.ts', 84, 0, 'added')]],
  ['2017-07-12T18:44:00Z', 'sofia', 'Give every language its own light', [file('src/renderer/palette.ts', 122, 0, 'added'), file('src/renderer/materials.ts', 44, 12)]],
  ['2018-02-03T07:25:00Z', 'idriss', 'Introduce the timeline', [file('src/timeline/player.ts', 210, 0, 'added'), file('src/timeline/clock.ts', 91, 0, 'added'), file('src/index.ts', 32, 14)]],
  ['2018-10-29T20:12:00Z', 'noah', 'Document the city grammar', [file('docs/city-grammar.md', 188, 0, 'added'), file('docs/architecture.md', 142, 0, 'added')]],
  ['2019-03-17T13:38:00Z', 'maya', 'Travelers arrive', [file('src/renderer/travelers.ts', 176, 0, 'added'), file('src/renderer/city.ts', 52, 18)]],
  ['2019-09-05T16:05:00Z', 'aki', 'Refactor renderer into a scene graph', [file('src/scene/city.ts', 286, 34, 'renamed', 'src/renderer/city.ts'), file('src/scene/travelers.ts', 202, 8, 'renamed', 'src/renderer/travelers.ts'), file('src/scene/lights.ts', 97, 0, 'added'), file('src/renderer/materials.ts', 0, 84, 'deleted')]],
  ['2020-02-14T10:14:00Z', 'sofia', 'Memorialize deleted code as ruins', [file('src/scene/ruins.ts', 148, 0, 'added'), file('src/scene/city.ts', 64, 21)]],
  ['2020-06-30T22:01:00Z', 'idriss', 'Make districts stable across time', [file('src/layout/districts.ts', 238, 0, 'added'), file('src/layout/hash.ts', 72, 0, 'added'), file('src/scene/city.ts', 38, 17)]],
  ['2020-12-11T08:42:00Z', 'maya', 'Ship project import', [file('src/import/local.ts', 194, 0, 'added'), file('src/import/schema.ts', 116, 0, 'added'), file('src/parser/git.ts', 41, 16)]],
  ['2021-04-23T14:50:00Z', 'noah', 'Add an accessible command deck', [file('src/ui/controls.tsx', 229, 0, 'added'), file('src/ui/a11y.ts', 112, 0, 'added'), file('src/index.ts', 47, 23)]],
  ['2021-10-08T19:16:00Z', 'sofia', 'Cinematic atmosphere pass', [file('src/scene/fog.ts', 104, 0, 'added'), file('src/scene/lights.ts', 86, 22), file('src/scene/palette.ts', 151, 0, 'added')]],
  ['2022-03-15T12:20:00Z', 'aki', 'Rebuild timeline for long histories', [file('src/history/timeline.ts', 314, 19, 'renamed', 'src/timeline/player.ts'), file('src/history/sampler.ts', 166, 0, 'added'), file('src/timeline/clock.ts', 0, 91, 'deleted')]],
  ['2022-08-26T17:55:00Z', 'idriss', 'Detect releases and refactor eras', [file('src/history/events.ts', 218, 0, 'added'), file('src/history/timeline.ts', 58, 14)]],
  ['2023-01-09T09:01:00Z', 'maya', 'Export the first time-lapse', [file('src/export/recorder.ts', 264, 0, 'added'), file('src/export/compositor.ts', 181, 0, 'added')]],
  ['2023-05-21T21:28:00Z', 'sofia', 'Add title cards and film grain', [file('src/export/titles.ts', 143, 0, 'added'), file('src/export/compositor.ts', 77, 20), file('src/ui/export.tsx', 196, 0, 'added')]],
  ['2023-11-02T06:45:00Z', 'noah', 'Performance: one draw call per district', [file('src/scene/instancing.ts', 207, 0, 'added'), file('src/scene/city.ts', 61, 92)]],
  ['2024-02-18T15:13:00Z', 'idriss', 'Merge branch histories without losing the plot', [file('src/parser/branches.ts', 233, 0, 'added'), file('src/parser/git.ts', 74, 28), file('src/import/schema.ts', 33, 11)]],
  ['2024-06-07T11:39:00Z', 'aki', 'Refactor the archive into a streaming core', [file('src/core/history.ts', 352, 0, 'added'), file('src/core/timeline.ts', 88, 314, 'renamed', 'src/history/timeline.ts'), file('src/history/sampler.ts', 42, 72), file('src/import/local.ts', 0, 194, 'deleted'), file('src/import/schema.ts', 0, 138, 'deleted'), file('src/parser/branches.ts', 31, 16), file('src/parser/git.ts', 48, 37), file('src/index.ts', 22, 27)]],
  ['2024-10-30T18:22:00Z', 'maya', 'A city that remembers everything', [file('src/core/ruins.ts', 203, 0, 'added'), file('src/core/history.ts', 82, 26), file('docs/architecture.md', 64, 18)]],
  ['2025-03-12T10:07:00Z', 'sofia', 'Museum-grade visual system', [file('src/ui/theme.css', 418, 0, 'added'), file('src/scene/palette.ts', 89, 51), file('src/ui/controls.tsx', 74, 38)]],
  ['2025-08-19T13:31:00Z', 'idriss', 'Compose 4K exports in real time', [file('src/export/compositor.ts', 119, 63), file('src/export/recorder.ts', 94, 41), file('src/export/encoder.ts', 257, 0, 'added')]],
  ['2026-01-24T08:18:00Z', 'noah', 'Keyboard flight controls', [file('src/ui/navigation.ts', 188, 0, 'added'), file('src/ui/a11y.ts', 47, 12)]],
  ['2026-05-09T16:49:00Z', 'maya', 'The definitive visual history engine', [file('src/index.ts', 81, 19), file('README.md', 126, 22), file('docs/city-grammar.md', 54, 14), file('src/export/encoder.ts', 36, 17)]],
]

const commits: Commit[] = rawCommits.map(([authoredAt, authorId, message, files], index) => ({
  hash: `${(index + 1).toString(16).padStart(7, '0')}c1ty${index.toString(16).padStart(2, '0')}`,
  parents: index === 0 ? [] : [`${index.toString(16).padStart(7, '0')}c1ty${(index - 1).toString(16).padStart(2, '0')}`],
  authorId,
  authoredAt,
  message,
  additions: files.reduce((sum, change) => sum + change.additions, 0),
  deletions: files.reduce((sum, change) => sum + change.deletions, 0),
  files,
}))

commits[18].parents.push(commits[15].hash)
commits[16].refs = ['film-export']
commits[19].refs = ['streaming-core']
commits.at(-1)!.refs = ['main']

export const sampleHistory: RepositoryHistory = {
  schemaVersion: 1,
  repository: {
    name: 'repo-rewind',
    branch: 'main',
    scope: 'branch',
    generatedAt: '2026-08-20T18:00:00Z',
    firstCommitAt: commits[0].authoredAt,
    lastCommitAt: commits[commits.length - 1].authoredAt,
  },
  contributors: people,
  commits,
  releases: [
    { tag: 'v0.1.0', date: '2017-01-20T11:04:00Z', commitHash: commits[2].hash, message: 'First light' },
    { tag: 'v1.0.0', date: '2021-04-23T14:50:00Z', commitHash: commits[11].hash, message: 'The city opens' },
    { tag: 'v2.0.0', date: '2023-05-21T21:28:00Z', commitHash: commits[16].hash, message: 'Motion picture edition' },
    { tag: 'v3.0.0', date: '2025-08-19T13:31:00Z', commitHash: commits[22].hash, message: 'Archive cinema' },
  ],
  branches: [
    { name: 'main', tipHash: commits.at(-1)!.hash, color: '#63d8bd', isCurrent: true, isRemote: false },
    { name: 'film-export', tipHash: commits[16].hash, color: '#ffb45c', isCurrent: false, isRemote: false },
    { name: 'streaming-core', tipHash: commits[19].hash, color: '#82aaff', isCurrent: false, isRemote: false },
  ],
}
