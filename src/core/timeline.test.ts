import { describe, expect, it } from 'vitest'
import { sampleEvenly } from './timeline'

describe('timeline landmark sampling', () => {
  it('keeps small collections intact and deterministically spans large collections', () => {
    expect(sampleEvenly([1, 2, 3], 4)).toEqual([1, 2, 3])
    expect(
      sampleEvenly(
        Array.from({ length: 1_000 }, (_, index) => index),
        5,
      ),
    ).toEqual([0, 250, 500, 749, 999])
  })

  it('handles empty and disabled marker budgets safely', () => {
    expect(sampleEvenly([], 10)).toEqual([])
    expect(sampleEvenly([1, 2, 3], 1)).toEqual([3])
    expect(sampleEvenly([1, 2, 3], 0)).toEqual([])
  })
})
