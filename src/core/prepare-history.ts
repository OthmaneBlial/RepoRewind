import { buildHistoryIndex, parseHistoryJson } from './history'
import type { HistoryIndex, RepositoryHistory } from './types'

export interface PreparedHistory {
  history: RepositoryHistory
  index: HistoryIndex
}

interface WorkerMessage {
  type: 'progress' | 'ready' | 'error'
  progress?: number
  history?: RepositoryHistory
  index?: HistoryIndex
  message?: string
}

export const MAX_HISTORY_FILE_BYTES = 256 * 1024 * 1024

function abortError(): DOMException {
  return new DOMException('Import canceled.', 'AbortError')
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('The selected history file could not be read.'))
    reader.readAsText(file)
  })
}

export async function prepareHistoryFile(
  file: File,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
): Promise<PreparedHistory> {
  if (file.size > MAX_HISTORY_FILE_BYTES) {
    throw new Error(
      `History files are limited to ${Math.round(MAX_HISTORY_FILE_BYTES / 1024 / 1024)} MB. Re-run the analyzer with --max-commits.`,
    )
  }
  if (signal?.aborted) throw abortError()
  if (typeof Worker === 'undefined') {
    onProgress(0.05)
    await new Promise((resolve) => setTimeout(resolve, 0))
    const history = parseHistoryJson(await readFileText(file))
    if (signal?.aborted) throw abortError()
    const index = buildHistoryIndex(history, (progress) => {
      if (signal?.aborted) throw abortError()
      onProgress(0.1 + progress * 0.9)
    })
    return { history, index }
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/history.worker.ts', import.meta.url), { type: 'module' })
    let settled = false
    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort)
      worker.terminate()
    }
    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      action()
    }
    const handleAbort = () => finish(() => reject(abortError()))
    signal?.addEventListener('abort', handleAbort, { once: true })
    if (signal?.aborted) {
      handleAbort()
      return
    }
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data
      if (message.type === 'progress') onProgress(message.progress ?? 0)
      if (message.type === 'ready' && message.history && message.index) {
        finish(() => resolve({ history: message.history!, index: message.index! }))
      }
      if (message.type === 'error') {
        finish(() => reject(new Error(message.message ?? 'The history worker could not prepare this archive.')))
      }
    }
    worker.onerror = (event) => {
      finish(() => reject(new Error(event.message || 'The history worker stopped unexpectedly.')))
    }
    worker.postMessage({ type: 'prepare', file })
  })
}
