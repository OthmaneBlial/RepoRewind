import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

function BrokenView(): never {
  throw new Error('Synthetic renderer failure')
}

describe('AppErrorBoundary', () => {
  it('shows a safe recovery view without an internal stack trace', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reload = vi.fn<() => void>()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    })

    render(
      <AppErrorBoundary>
        <BrokenView />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('The archive is safe')
    expect(screen.queryByText(/at BrokenView/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reload the demo' }))
    expect(reload).toHaveBeenCalledOnce()
  })
})
