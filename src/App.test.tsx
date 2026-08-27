import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App, { bootstrapArchiveUrl, safeRepositoryUrl } from './App'
import { sampleHistory } from './data/sample-history'

vi.mock('./components/CityScene', () => ({
  CityScene: () => <div data-testid="repository-city">Interactive city renderer</div>,
}))

afterEach(() => {
  document.querySelector('meta[name="reporewind-archive"]')?.remove()
  vi.unstubAllGlobals()
})

describe('RepoRewind application', () => {
  it('opens the deterministic demo and keeps modal focus and keyboard dismissal accessible', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect((await screen.findAllByText('Fictional demo'))[0]).toBeVisible()
    expect(screen.getByRole('button', { name: 'Search archive' })).toHaveAttribute('aria-label', 'Search archive')
    const importButton = screen.getByRole('button', { name: /^Import$/ })
    await user.click(importButton)

    const dialog = screen.getByRole('dialog', { name: 'Bring your repository’s past to life.' })
    expect(dialog).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Demo active' })).toBeDisabled()
    expect(within(dialog).getByText(/processed in this tab and never uploaded/i)).toBeVisible()

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

  it('keeps WebM available when the runtime cannot encode MP4', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Export film' }))
    const dialog = screen.getByRole('dialog', { name: 'Direct your time-lapse.' })
    expect(await within(dialog).findByText(/WebM is selected/)).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'MP4' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Render WEBM film' })).toBeEnabled()
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

    await user.click(await screen.findByRole('button', { name: /^Import$/ }))
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

    await user.click(await screen.findByRole('button', { name: /^Import$/ }))
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')
    await user.upload(input!, new File(['not json'], 'broken-history.json', { type: 'application/json' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON')
    expect(screen.getByRole('dialog', { name: 'Bring your repository’s past to life.' })).toBeVisible()
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
