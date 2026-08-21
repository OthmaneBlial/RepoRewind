/// <reference lib="webworker" />
import { buildHistoryIndex, validateHistory } from '../core/history'

self.onmessage = async (event: MessageEvent<{ type: 'prepare'; file: File }>) => {
  if (event.data.type !== 'prepare') return
  try {
    self.postMessage({ type: 'progress', progress: 0.02 })
    const text = await event.data.file.text()
    self.postMessage({ type: 'progress', progress: 0.07 })
    const history = validateHistory(JSON.parse(text))
    self.postMessage({ type: 'progress', progress: 0.1 })
    const index = buildHistoryIndex(history, (progress) => {
      self.postMessage({ type: 'progress', progress: 0.1 + progress * 0.9 })
    })
    self.postMessage({ type: 'ready', history, index })
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'This history file could not be prepared.',
    })
  }
}

export {}
