import { describe, expect, it } from 'vitest'
import { parseNameStatus, parseNumstat } from './git-reader'

describe('git reader parsers', () => {
  it('parses additions, deletions, binaries, and compact rename paths', () => {
    const output = '\u001eabc\u001f\u001fMaya\u001fmaya@example.test\u001f2026-01-01T00:00:00Z\u001fRefactor\n10\t2\tsrc/app.ts\n-\t-\tpublic/map.png\n4\t1\tsrc/{old => new}/city.ts'
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
})
