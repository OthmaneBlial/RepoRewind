import { describe, expect, it } from 'vitest'
import { sampleHistory } from '../data/sample-history'
import { buildTimelapseFramePlan, historyFilmFilename } from './timelapse'

describe('buildTimelapseFramePlan', () => {
  it('creates an exact fixed-rate activity timeline including both archive endpoints', () => {
    const plan = buildTimelapseFramePlan(sampleHistory, sampleHistory.commits.length, 1, 5, 'activity')

    expect(plan).toHaveLength(5)
    expect(plan[0]).toMatchObject({ frame: 0, progress: 0, snapshotIndex: 0, timestamp: 0, duration: 0.2 })
    expect(plan.at(-1)).toMatchObject({
      frame: 4,
      progress: 1,
      snapshotIndex: sampleHistory.commits.length - 1,
      timestamp: 0.8,
      duration: 0.2,
    })
    expect(plan.map((frame) => frame.snapshotIndex)).toEqual([0, 6, 12, 18, 24])
  })

  it('maps calendar pacing through commit dates without using render time', () => {
    const plan = buildTimelapseFramePlan(sampleHistory, sampleHistory.commits.length, 4, 2, 'chronological')

    expect(plan.map((frame) => frame.timestamp)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5])
    expect(plan.map((frame) => frame.snapshotIndex)).toEqual([0, 3, 5, 9, 12, 16, 20, 24])
    expect(plan.every((frame) => frame.duration === 0.5)).toBe(true)
  })

  it('rejects invalid film settings', () => {
    expect(() => buildTimelapseFramePlan(sampleHistory, 0, 1, 30, 'activity')).toThrow('does not contain any frames')
    expect(() => buildTimelapseFramePlan(sampleHistory, 1, 0, 30, 'activity')).toThrow('must be positive')
  })

  it('creates safe, bounded download names from imported repository metadata', () => {
    expect(historyFilmFilename('../../private:repo', 'mp4')).toBe('private-repo-history.mp4')
    expect(historyFilmFilename('   ', 'webm')).toBe('repository-history.webm')
    expect(historyFilmFilename('a'.repeat(200), 'mp4')).toBe(`${'a'.repeat(120)}-history.mp4`)
  })
})
