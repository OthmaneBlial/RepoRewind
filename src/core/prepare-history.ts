import { buildHistoryIndex, validateHistory } from './history'
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

export async function prepareHistoryFile(
  file: File,
  onProgress: (progress: number) => void,
): Promise<PreparedHistory> {
  if (typeof Worker === 'undefined') {
    onProgress(0.05)
    await new Promise((resolve) => setTimeout(resolve, 0))
    const history = validateHistory(JSON.parse(await file.text()))
    const index = buildHistoryIndex(history, (progress) => onProgress(0.1 + progress * 0.9))
    return { history, index }
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/history.worker.ts', import.meta.url), { type: 'module' })
    const cleanup = () => worker.terminate()
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data
      if (message.type === 'progress') onProgress(message.progress ?? 0)
      if (message.type === 'ready' && message.history && message.index) {
        cleanup()
        resolve({ history: message.history, index: message.index })
      }
      if (message.type === 'error') {
        cleanup()
        reject(new Error(message.message ?? 'The history worker could not prepare this archive.'))
      }
    }
    worker.onerror = (event) => {
      cleanup()
      reject(new Error(event.message || 'The history worker stopped unexpectedly.'))
    }
    worker.postMessage({ type: 'prepare', file })
  })
}
