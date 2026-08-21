import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'
import archiveSchema from '../../schema/reporewind-history.schema.json'
import { sampleHistory } from '../data/sample-history'

const ajv = new Ajv2020({ allErrors: true, strict: true })
addFormats(ajv)
const validateArchive = ajv.compile(archiveSchema)

describe('public archive schema', () => {
  it('accepts the shipped deterministic demo archive', () => {
    expect(validateArchive(sampleHistory)).toBe(true)
    expect(validateArchive.errors).toBeNull()
  })

  it('rejects unknown fields and unsafe numeric values', () => {
    const unknownField = { ...structuredClone(sampleHistory), telemetry: true }
    expect(validateArchive(unknownField)).toBe(false)
    expect(validateArchive.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ keyword: 'additionalProperties' })]),
    )

    const unsafeCount = structuredClone(sampleHistory)
    unsafeCount.commits[0].files[0].additions = -1
    expect(validateArchive(unsafeCount)).toBe(false)
    expect(validateArchive.errors).toEqual(expect.arrayContaining([expect.objectContaining({ keyword: 'minimum' })]))
  })
})
