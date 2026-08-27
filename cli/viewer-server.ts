import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { createServer, type Server, type ServerResponse } from 'node:http'
import { extname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RepositoryHistory } from '../src/core/types'

const LOOPBACK_HOST = '127.0.0.1'
const MAX_VIEWER_ARCHIVE_BYTES = 256 * 1024 * 1024
const ARCHIVE_META = '<meta name="reporewind-archive" content="" />'

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webm', 'video/webm'],
])

const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
} as const

export interface ViewerSession {
  close: () => Promise<void>
  server: Server
  url: string
}

export interface ViewerServerOptions {
  history: RepositoryHistory
  webRoot?: string
}

export function packagedWebRoot(): string {
  return fileURLToPath(new URL('../dist/', import.meta.url))
}

function writeResponse(
  response: ServerResponse,
  statusCode: number,
  body: string | Buffer,
  headers: Record<string, string> = {},
  headOnly = false,
): void {
  const contentLength = Buffer.byteLength(body)
  response.writeHead(statusCode, {
    ...securityHeaders,
    'Content-Length': String(contentLength),
    ...headers,
  })
  response.end(headOnly ? undefined : body)
}

function safeFileTarget(webRoot: string, requestPath: string): string | undefined {
  let decoded: string
  try {
    decoded = decodeURIComponent(requestPath)
  } catch {
    return undefined
  }
  if (!decoded || decoded.includes('\0') || decoded.includes('\\')) return undefined
  const target = resolve(webRoot, decoded)
  const withinRoot = relative(webRoot, target)
  if (withinRoot.startsWith('..') || isAbsolute(withinRoot)) return undefined
  return target
}

function mimeType(filename: string): string {
  return contentTypes.get(extname(filename).toLocaleLowerCase()) ?? 'application/octet-stream'
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()))
  })
}

export async function startViewerServer(options: ViewerServerOptions): Promise<ViewerSession> {
  const webRoot = resolve(options.webRoot ?? packagedWebRoot())
  const sourceIndex = await readFile(resolve(webRoot, 'index.html'), 'utf8')
  if (!sourceIndex.includes(ARCHIVE_META)) {
    throw new Error('The packaged viewer is missing its local archive bootstrap marker.')
  }

  const serializedHistory = Buffer.from(`${JSON.stringify(options.history)}\n`)
  if (serializedHistory.byteLength > MAX_VIEWER_ARCHIVE_BYTES) {
    throw new Error('The generated history exceeds the 256 MB viewer limit. Re-run with --max-commits.')
  }

  const token = randomBytes(24).toString('base64url')
  const sessionPrefix = `/${token}/`
  const index = sourceIndex.replace(ARCHIVE_META, '<meta name="reporewind-archive" content="./history.json" />')

  const server = createServer((request, response) => {
    void (async () => {
      const method = request.method ?? 'GET'
      if (method !== 'GET' && method !== 'HEAD') {
        writeResponse(response, 405, 'Method not allowed.\n', { Allow: 'GET, HEAD' }, method === 'HEAD')
        return
      }

      const requestUrl = new URL(request.url ?? '/', `http://${LOOPBACK_HOST}`)
      if (requestUrl.pathname === sessionPrefix.slice(0, -1)) {
        response.writeHead(308, { ...securityHeaders, Location: sessionPrefix })
        response.end()
        return
      }
      if (!requestUrl.pathname.startsWith(sessionPrefix)) {
        writeResponse(response, 404, 'Not found.\n', {}, method === 'HEAD')
        return
      }

      const sessionPath = requestUrl.pathname.slice(sessionPrefix.length)
      if (sessionPath === '' || sessionPath === 'index.html') {
        writeResponse(
          response,
          200,
          index,
          { 'Cache-Control': 'no-store', 'Content-Type': 'text/html; charset=utf-8' },
          method === 'HEAD',
        )
        return
      }
      if (sessionPath === 'history.json') {
        writeResponse(
          response,
          200,
          serializedHistory,
          { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' },
          method === 'HEAD',
        )
        return
      }

      const target = safeFileTarget(webRoot, sessionPath)
      if (!target) {
        writeResponse(response, 404, 'Not found.\n', {}, method === 'HEAD')
        return
      }
      try {
        const details = await stat(target)
        if (!details.isFile()) throw new Error('Not a file')
        response.writeHead(200, {
          ...securityHeaders,
          'Cache-Control': sessionPath.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
          'Content-Length': String(details.size),
          'Content-Type': mimeType(target),
        })
        if (method === 'HEAD') response.end()
        else createReadStream(target).pipe(response)
      } catch {
        writeResponse(response, 404, 'Not found.\n', {}, method === 'HEAD')
      }
    })().catch(() => {
      if (!response.headersSent) writeResponse(response, 500, 'Viewer request failed.\n')
      else response.destroy()
    })
  })

  await new Promise<void>((resolveListen, rejectListen) => {
    const onError = (error: Error) => rejectListen(error)
    server.once('error', onError)
    server.listen(0, LOOPBACK_HOST, () => {
      server.off('error', onError)
      resolveListen()
    })
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    await closeServer(server)
    throw new Error('The loopback viewer did not receive a TCP port.')
  }

  return {
    server,
    url: `http://${LOOPBACK_HOST}:${address.port}${sessionPrefix}`,
    close: () => closeServer(server),
  }
}

export async function openViewerInBrowser(url: string): Promise<boolean> {
  const command =
    process.platform === 'darwin' ? '/usr/bin/open' : process.platform === 'win32' ? 'cmd.exe' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'start', '', url] : [url]
  return new Promise((resolveOpen) => {
    let settled = false
    const child = spawn(command, args, { detached: true, stdio: 'ignore' })
    const finish = (opened: boolean) => {
      if (settled) return
      settled = true
      if (opened) child.unref()
      resolveOpen(opened)
    }
    child.once('spawn', () => finish(true))
    child.once('error', () => finish(false))
  })
}
