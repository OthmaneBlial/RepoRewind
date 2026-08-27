import { describe, expect, it } from 'vitest'
import { rendererQualityForPathCount } from './renderer-quality'

describe('adaptive renderer quality', () => {
  it('keeps ordinary cities cinematic', () => {
    expect(rendererQualityForPathCount(1_000)).toEqual({
      tier: 'cinematic',
      maximumDpr: 1.65,
      antialias: true,
      shadows: true,
      shadowMapSize: 2048,
    })
  })

  it('bounds pixel and shadow cost for medium and dense cities', () => {
    expect(rendererQualityForPathCount(1_001)).toMatchObject({ tier: 'balanced', maximumDpr: 1.25, shadows: true })
    expect(rendererQualityForPathCount(5_001)).toEqual({
      tier: 'dense',
      maximumDpr: 1,
      antialias: false,
      shadows: false,
      shadowMapSize: 1024,
    })
  })
})
