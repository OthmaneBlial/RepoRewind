import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  error?: Error
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {}

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // React reports the component stack in development. Production keeps the recovery UI intentionally concise.
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="fatal-error" role="alert">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <p className="eyebrow">Renderer interrupted</p>
        <h1>The archive is safe. This view needs a fresh start.</h1>
        <p>
          RepoRewind keeps imported history in memory only, so reloading clears the failed view without changing the
          source repository or its export file.
        </p>
        <button onClick={() => window.location.reload()}>Reload the demo</button>
        <details>
          <summary>Technical detail</summary>
          <code>{this.state.error.message || 'Unexpected rendering error'}</code>
        </details>
      </main>
    )
  }
}
