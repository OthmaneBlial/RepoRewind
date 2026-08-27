import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/poster.yml'), 'utf8')
const action = readFileSync(resolve(process.cwd(), '.github/actions/poster/action.yml'), 'utf8')

describe('poster Action security contract', () => {
  it('remains manual, read-only, artifact-only, and bounded', () => {
    expect(workflow).toMatch(/^on:\n  workflow_dispatch:/m)
    expect(workflow).toContain('permissions:\n  contents: read')
    expect(workflow).toContain('fetch-depth: 0')
    expect(workflow).toContain('retention-days: ${{ inputs.retention_days }}')
    expect(workflow).not.toMatch(/^  (push|pull_request|release|schedule):/m)
    expect(workflow).not.toMatch(/contents:\s*write|pull-requests:|pages:|id-token:/)
    expect(workflow).not.toMatch(/git push|gh release|deploy-pages|pages-build-deployment|pulls\/|issues\//)
  })

  it('pins third-party Actions to immutable full commit SHAs', () => {
    const thirdPartyUses = [...workflow.matchAll(/^\s*uses:\s*([^./\s][^@\s]*)@([^\s#]+)/gm)]
    expect(thirdPartyUses).toHaveLength(3)
    for (const match of thirdPartyUses) expect(match[2]).toMatch(/^[a-f0-9]{40}$/)
  })

  it('passes untrusted GitHub and caller values through environment variables', () => {
    const runScript = action.slice(action.indexOf('      run: |'))
    expect(runScript).not.toContain('${{')
    expect(action).toContain('REPOREWIND_ACTION_REF: ${{ inputs.ref }}')
    expect(action).toContain('REPOREWIND_ACTION_REPOSITORY: ${{ github.workspace }}')
    expect(action).toContain('REPOREWIND_ACTION_REPOSITORY_VISIBILITY: ${{ github.event.repository.visibility }}')
  })
})
