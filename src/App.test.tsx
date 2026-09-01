import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App, { bootstrapArchiveUrl, safeRepositoryUrl } from './App'
import { sampleHistory } from './data/sample-history'

const webglCapability = vi.hoisted(() => ({ available: true }))

vi.mock('./components/CityScene', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react')
  return {
    CityScene: ({ onUnavailable }: { onUnavailable: (reason: string) => void }) => {
      useEffect(() => {
        if (!webglCapability.available) onUnavailable('WebGL is unavailable in this test browser.')
      }, [onUnavailable])
      return webglCapability.available ? <div data-testid="repository-city">Interactive city renderer</div> : null
    },
  }
})

afterEach(() => {
  webglCapability.available = true
  document.querySelector('meta[name="reporewind-archive"]')?.remove()
  vi.unstubAllGlobals()
})

describe('RepoRewind application', () => {
  it('opens the deterministic demo and keeps modal focus and keyboard dismissal accessible', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect((await screen.findAllByText('Fictional demo'))[0]).toBeVisible()
    expect(screen.getByRole('button', { name: 'Search archive' })).toHaveAttribute('aria-label', 'Search archive')
    const importButton = screen.getByRole('button', { name: /^Open archive$/ })
    await user.click(importButton)

    const dialog = screen.getByRole('dialog', { name: 'Bring a repository’s past into this tab.' })
    expect(dialog).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Demo active' })).toBeDisabled()
    expect(within(dialog).getByText(/opens in this tab\. nothing is uploaded/i)).toBeVisible()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(importButton).toHaveFocus()
  })

  it('loads a same-origin loopback archive into the local session automatically', async () => {
    const meta = document.createElement('meta')
    meta.name = 'reporewind-archive'
    meta.content = './history.json'
    document.head.append(meta)
    const localHistory = {
      ...sampleHistory,
      repository: { ...sampleHistory.repository, name: 'automatic-local-fixture' },
    }
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        ({
          blob: async () => new Blob([JSON.stringify(localHistory)], { type: 'application/json' }),
          ok: true,
          status: 200,
        }) as Response,
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('Worker', undefined)

    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Mapping your repository’s history')
    expect(await screen.findByText('automatic-local-fixture')).toBeVisible()
    expect((await screen.findAllByText('Local archive'))[0]).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('./history.json', window.location.href).href,
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }),
    )
  })

  it('searches the archive from the keyboard and opens a real file inspector', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByTestId('repository-city')
    await user.keyboard('{Control>}k{/Control}')
    const search = screen.getByRole('combobox', { name: 'Search repository history' })
    await user.type(search, 'file: src/core/history.ts')

    const result = await screen.findByRole('option', { name: /src\/core\/history\.ts/i })
    expect(result).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')

    const inspector = screen.getByRole('region', { name: 'Selected building' })
    expect(within(inspector).getByRole('heading', { name: 'history.ts' })).toBeVisible()
    expect(within(inspector).getByText('src/core/history.ts')).toBeVisible()
  })

  it('guides a visitor through a real rebuild comparison and into the truthful local path', async () => {
    const user = userEvent.setup()
    render(<App />)

    const caseFile = screen.getByRole('complementary', { name: 'Guided rebuild case' })
    expect(within(caseFile).getByRole('heading', { name: 'Find the rebuild.' })).toBeVisible()
    await user.click(within(caseFile).getByRole('button', { name: /Start at v2\.0\.0/ }))
    expect(screen.getByRole('slider', { name: 'History position' })).toHaveValue('16')

    await user.click(screen.getByRole('button', { name: 'Pin this era' }))
    expect(within(caseFile).getByRole('heading', { name: 'Find the structural move.' })).toBeVisible()
    await user.click(within(caseFile).getByRole('button', { name: /Search the rebuild/ }))

    const search = screen.getByRole('combobox', { name: 'Search repository history' })
    expect(search).toHaveValue('commit: streaming core')
    await user.keyboard('{Enter}')
    expect(within(caseFile).getByRole('heading', { name: 'The move stays visible.' })).toBeVisible()

    await user.click(within(caseFile).getByRole('button', { name: /Jump to v3\.0\.0/ }))
    expect(screen.getByRole('slider', { name: 'History position' })).toHaveValue('22')
    await user.click(screen.getByRole('button', { name: 'Compare eras' }))
    expect(screen.getByRole('dialog', { name: 'Two eras. Every structural change.' })).toBeVisible()
    await user.keyboard('{Escape}')

    expect(within(caseFile).getByRole('heading', { name: 'You found the rebuild.' })).toBeVisible()
    await user.click(within(caseFile).getByRole('button', { name: /Run on my repository/ }))
    const runDialog = screen.getByRole('dialog', { name: 'Open your repository with one command.' })
    expect(within(runDialog).getByText(/first run downloads RepoRewind from npm/i)).toBeVisible()
    expect(within(runDialog).getByText(/cd \/path\/to\/your\/repository\s+npx reporewind \./)).toBeVisible()
  })

  it('pins an era, travels through history, and opens the temporal diff', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByTestId('repository-city')
    await user.click(screen.getByRole('button', { name: 'Pin this era' }))
    expect(screen.getByRole('status')).toHaveTextContent('Era pinned')

    fireEvent.change(screen.getByRole('slider', { name: 'History position' }), { target: { value: '24' } })
    await user.click(await screen.findByRole('button', { name: 'Compare eras' }))

    expect(screen.getByRole('dialog', { name: 'Two eras. Every structural change.' })).toBeVisible()
    expect(screen.getByText('Most consequential sites')).toBeVisible()
  })

  it('opens the evidence desk without WebGL and navigates every ranked result to its commit', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Insights' }))
    const dialog = screen.getByRole('dialog', { name: 'What changed, where, and when?' })
    expect(within(dialog).getByRole('heading', { name: 'Frequently changed paths' })).toBeVisible()
    expect(within(dialog).getByRole('heading', { name: 'Activity distribution over time' })).toBeVisible()
    expect(within(dialog).getByText(/not time spent or code quality/i)).toBeVisible()
    expect(within(dialog).getByText(/stays useful without the 3D city/i)).toBeVisible()

    const evidenceButton = within(dialog).getAllByRole('button', { name: /Evidence · commit/ })[0]
    const evidenceCommit = Number(evidenceButton.textContent?.match(/Evidence · commit (\d+)/)?.[1])
    expect(evidenceCommit).toBeGreaterThan(0)
    await user.click(evidenceButton)

    expect(screen.queryByRole('dialog', { name: 'What changed, where, and when?' })).not.toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'History position' })).toHaveValue(String(evidenceCommit - 1))
    expect(screen.getByRole('status')).toHaveTextContent(`Evidence opened at commit ${evidenceCommit}`)
  })

  it('keeps the archive useful when WebGL is unavailable', async () => {
    webglCapability.available = false
    const user = userEvent.setup()
    render(<App />)

    const evidenceView = await screen.findByRole('region', { name: 'Repository evidence view' })
    expect(within(evidenceView).getByRole('heading', { name: 'WebGL is unavailable.' })).toBeVisible()
    expect(screen.queryByTestId('repository-city')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open 3D city' })).toBeDisabled()

    await user.click(within(evidenceView).getByRole('button', { name: /Search archive/ }))
    expect(screen.getByRole('combobox', { name: 'Search repository history' })).toBeVisible()
    await user.keyboard('{Escape}')

    await user.click(within(evidenceView).getByRole('button', { name: /Open Insights/ }))
    expect(screen.getByRole('dialog', { name: 'What changed, where, and when?' })).toBeVisible()
    await user.keyboard('{Escape}')

    await user.click(within(evidenceView).getByRole('button', { name: /Pin or compare era/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Era pinned')
    fireEvent.change(screen.getByRole('slider', { name: 'History position' }), { target: { value: '24' } })
    await user.click(within(evidenceView).getByRole('button', { name: /Pin or compare era/ }))
    expect(screen.getByRole('dialog', { name: 'Two eras. Every structural change.' })).toBeVisible()
  })

  it('keeps WebM available when the runtime cannot encode MP4', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Export film' }))
    const dialog = screen.getByRole('dialog', { name: 'Direct your time-lapse.' })
    expect(await within(dialog).findByText(/WebM is selected/)).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'MP4' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Story pack' })).toHaveClass('active')
    expect(within(dialog).getByRole('button', { name: 'Build story pack' })).toBeEnabled()
    await user.click(within(dialog).getByRole('button', { name: 'Film only' }))
    expect(within(dialog).getByRole('button', { name: 'Render WEBM film' })).toBeEnabled()
  })

  it('starts with a public-safe film projection and gates sensitive overrides', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Export film' }))
    const dialog = screen.getByRole('dialog', { name: 'Direct your time-lapse.' })
    expect(within(dialog).getByRole('button', { name: 'Public share' })).toHaveClass('active')
    expect(within(dialog).getByLabelText('Current export field preview')).toHaveTextContent('Repository history')
    expect(within(dialog).getByText(/repository\.genericLabel/)).toBeVisible()

    const renderButton = await within(dialog).findByRole('button', { name: 'Build story pack' })
    expect(renderButton).toBeEnabled()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Repository name' }))
    expect(renderButton).toBeDisabled()
    await user.click(within(dialog).getByRole('checkbox', { name: /I reviewed these public fields/ }))
    expect(renderButton).toBeEnabled()
  })

  it('requires an explicit public-export review when the canonical archive contains emails', async () => {
    vi.stubGlobal('Worker', undefined)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /^Open archive$/ }))
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    const historyWithEmail = structuredClone(sampleHistory)
    historyWithEmail.contributors[0].email = 'private@example.test'
    await user.upload(
      input!,
      new File([JSON.stringify(historyWithEmail)], 'history-with-email.json', { type: 'application/json' }),
    )
    await screen.findByText('Local archive')
    await user.click(screen.getByRole('button', { name: 'Export film' }))

    const dialog = screen.getByRole('dialog', { name: 'Direct your time-lapse.' })
    const renderButton = await within(dialog).findByRole('button', { name: 'Build story pack' })
    const emailReview = within(dialog).getByRole('checkbox', { name: /canonical archive contains emails/i })
    expect(renderButton).toBeDisabled()
    expect(within(dialog).getByText(/contributors\.email/)).toBeVisible()
    await user.click(emailReview)
    expect(renderButton).toBeEnabled()
  })

  it('lets operators reorder, exclude, retitle, and inspect deterministic story chapters', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Export film' }))
    const dialog = screen.getByRole('dialog', { name: 'Direct your time-lapse.' })
    await user.click(within(dialog).getByText('Review chapter plan and Git evidence', { exact: true }))

    const buildButton = within(dialog).getByRole('button', { name: 'Build story pack' })
    const originTitle = within(dialog).getByRole('textbox', { name: 'Title for Origins' })
    const growthTitle = within(dialog).getByRole('textbox', { name: 'Title for Growth spurt' })
    expect(originTitle).toHaveValue('Origins')
    await user.click(within(dialog).getByRole('button', { name: 'Move Origins later' }))
    expect(within(dialog).getAllByRole('textbox').slice(0, 2)).toEqual([growthTitle, originTitle])

    await user.clear(originTitle)
    await user.type(originTitle, 'Foundations')
    expect(buildButton).toBeDisabled()
    await user.click(within(dialog).getByRole('checkbox', { name: /reviewed the custom story chapter titles/i }))
    expect(buildButton).toBeEnabled()

    await user.click(within(dialog).getByRole('checkbox', { name: 'Include Growth spurt' }))
    expect(within(dialog).getByText(/included$/)).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'View Git evidence · commit 1' }))
    expect(screen.getByRole('slider', { name: 'History position' })).toHaveValue('0')
  })

  it('reports unavailable fullscreen support without breaking the city', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Toggle fullscreen' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Fullscreen is unavailable in this browser.')
    expect(screen.getByTestId('repository-city')).toBeVisible()
  })

  it('validates an imported archive, marks it as local, and restores the fictional demo', async () => {
    vi.stubGlobal('Worker', undefined)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /^Open archive$/ }))
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    const importedHistory = {
      ...sampleHistory,
      repository: { ...sampleHistory.repository, name: 'local-history-fixture' },
    }
    await user.upload(
      input!,
      new File([JSON.stringify(importedHistory)], 'reporewind-history.json', { type: 'application/json' }),
    )

    expect(await screen.findByText('Local archive')).toBeVisible()
    expect(screen.getByText('local-history-fixture')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('ready to explore')

    await user.click(screen.getByRole('button', { name: /local-history-fixture/i }))
    await user.click(screen.getByRole('button', { name: 'Open demo' }))
    expect((await screen.findAllByText('Fictional demo'))[0]).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('fictional ten-year demo archive has been restored')
  })

  it('keeps the import dialog recoverable when an archive is malformed', async () => {
    vi.stubGlobal('Worker', undefined)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /^Open archive$/ }))
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    await user.upload(input!, new File(['not json'], 'broken-history.json', { type: 'application/json' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON')
    expect(screen.getByRole('dialog', { name: 'Bring a repository’s past into this tab.' })).toBeVisible()
    expect(screen.getByRole('button', { name: /Choose a history file/ })).toBeEnabled()
  })
})

describe('repository URL sanitization', () => {
  it('accepts only same-origin archive bootstrap URLs', () => {
    const meta = document.createElement('meta')
    meta.name = 'reporewind-archive'
    meta.content = './history.json'
    document.head.append(meta)
    expect(bootstrapArchiveUrl()).toBe(new URL('./history.json', window.location.href).href)

    meta.content = 'https://example.test/history.json'
    expect(bootstrapArchiveUrl()).toBeUndefined()
  })

  it('allows web remotes, normalizes GitHub SSH remotes, and rejects active or local protocols', () => {
    expect(safeRepositoryUrl('git@github.com:example/reporewind.git')).toBe('https://github.com/example/reporewind')
    expect(safeRepositoryUrl('https://code.example/repository.git')).toBe('https://code.example/repository')
    expect(safeRepositoryUrl('http://localhost:3000/repository.git')).toBe('http://localhost:3000/repository')
    expect(safeRepositoryUrl('http://insecure.example/repository.git')).toBeUndefined()
    expect(safeRepositoryUrl('https://user:secret@code.example/repository.git')).toBeUndefined()
    expect(safeRepositoryUrl('https://code.example/repository.git?access_token=secret#fragment')).toBe(
      'https://code.example/repository',
    )
    expect(safeRepositoryUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeRepositoryUrl('file:///private/repository')).toBeUndefined()
  })
})
