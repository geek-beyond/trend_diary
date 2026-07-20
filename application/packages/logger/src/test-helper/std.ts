import type { VitestUtils } from 'vitest'

type StdoutWriteImpl = (
  chunk: string | Uint8Array,
  encodingOrCallback?: BufferEncoding | ((err?: Error | null) => void),
  callback?: (err?: Error | null) => void,
) => boolean

export class StdTestHelper {
  static captureStdout = (vi: VitestUtils): { logs: string[]; restore: () => void } => {
    const logs: string[] = []
    const spy = vi.spyOn(process.stdout, 'write')

    const impl: StdoutWriteImpl = (chunk, encodingOrCallback, callback) => {
      let encoding: BufferEncoding | undefined
      let cb: ((error?: Error | null) => void) | undefined

      if (typeof encodingOrCallback === 'function') {
        cb = encodingOrCallback
      } else {
        encoding = encodingOrCallback
        cb = callback
      }

      const logLine =
        typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString(encoding ?? 'utf8')
      logs.push(logLine)

      cb?.()

      return true
    }

    // oxlint-disable-next-line typescript/consistent-type-assertions -- process.stdout.writeはオーバーロードされた型であり、単一シグネチャのimplを直接代入できないため
    spy.mockImplementation(impl as typeof process.stdout.write)

    return {
      logs,
      restore: () => spy.mockRestore(),
    }
  }
}
