// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { parseNameStatus, parseNumstat, sanitizeRemote } from './git-reader'

describe('git reader parsers', () => {
  it('parses additions, deletions, binaries, and compact rename paths', () => {
    const output =
      '\u001eabc\u001f\u001fMaya\u001fmaya@example.test\u001f2026-01-01T00:00:00Z\u001fRefactor\n10\t2\tsrc/app.ts\n-\t-\tpublic/map.png\n4\t1\tsrc/{old => new}/city.ts'
    const [record] = parseNumstat(output)
    expect(record.header[0]).toBe('abc')
    expect(record.stats[0]).toMatchObject({ path: 'src/app.ts', additions: 10, deletions: 2 })
    expect(record.stats[1]).toMatchObject({ path: 'public/map.png', binary: true })
    expect(record.stats[2]).toMatchObject({ previousPath: 'src/old/city.ts', path: 'src/new/city.ts' })
  })

  it('parses Git name status records including renames and deletions', () => {
    const statuses = parseNameStatus('\u001eabc\nA\tsrc/new.ts\nR098\tsrc/old.ts\tsrc/moved.ts\nD\tsrc/dead.ts')
    expect(statuses.get('abc')).toEqual([
      { path: 'src/new.ts', status: 'added' },
      { path: 'src/moved.ts', previousPath: 'src/old.ts', status: 'renamed' },
      { path: 'src/dead.ts', status: 'deleted' },
    ])
  })

  it('preserves null-delimited paths that contain whitespace and rename markers', () => {
    const numstat = `\u001eabc\u001f\u001fMaya\u001fmaya@example.test\u001f2026-01-01T00:00:00Z\u001fPaths\0\n2\t1\tfile\twith-tab.ts\0\n3\t0\t\0 old name.ts \0 new name.ts \0`
    const [record] = parseNumstat(numstat)
    expect(record.stats).toEqual([
      { path: 'file\twith-tab.ts', additions: 2, deletions: 1, binary: false },
      { previousPath: ' old name.ts ', path: ' new name.ts ', additions: 3, deletions: 0, binary: false },
    ])

    const statuses = parseNameStatus('\u001eabc\0\nM\0file\twith-tab.ts\0R100\0 old name.ts \0 new name.ts \0')
    expect(statuses.get('abc')).toEqual([
      { path: 'file\twith-tab.ts', status: 'modified' },
      { previousPath: ' old name.ts ', path: ' new name.ts ', status: 'renamed' },
    ])
  })

  it('removes credentials and token-bearing URL components from remotes', () => {
    expect(sanitizeRemote('https://user:secret@example.test/team/repository.git?access_token=secret#fragment')).toBe(
      'https://example.test/team/repository.git',
    )
    expect(sanitizeRemote('git@github.com:example/repository.git')).toBe('git@github.com:example/repository.git')
    expect(sanitizeRemote('file:///Users/example/private-repository')).toBeUndefined()
    expect(sanitizeRemote('remote\nwith-control')).toBeUndefined()
  })
})
