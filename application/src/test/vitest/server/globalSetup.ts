import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { disconnectTestRdb } from '@/test/helper/rdb'

const moduleDir = dirname(fileURLToPath(import.meta.url))
const EMULATOR_DIR = resolve(moduleDir, '../../../../../emulator/supabase')
const EMULATOR_BIN = resolve(EMULATOR_DIR, 'bin/supabase-emulator')
const EMULATOR_ADDR = '127.0.0.1:54321'
const EMULATOR_HEALTH = `http://${EMULATOR_ADDR}/auth/v1/health`

let emulator: ChildProcess | null = null

function buildEmulatorIfNeeded(): void {
  if (existsSync(EMULATOR_BIN)) return
  const result = spawnSync('go', ['build', '-o', 'bin/supabase-emulator', '.'], {
    cwd: EMULATOR_DIR,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error(`Failed to build supabase emulator (exit=${result.status})`)
  }
}

async function waitForHealthy(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(EMULATOR_HEALTH)
      if (res.ok) return
    } catch {
      // 起動待ち
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(`Supabase emulator did not become healthy within ${timeoutMs}ms`)
}

async function startEmulator(): Promise<void> {
  buildEmulatorIfNeeded()
  emulator = spawn(EMULATOR_BIN, ['-addr', EMULATOR_ADDR], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  emulator.on('error', (err) => {
    process.stderr.write(`supabase emulator error: ${err.message}\n`)
  })
  await waitForHealthy(5000)
}

async function stopEmulator(): Promise<void> {
  if (!emulator) return
  emulator.kill('SIGTERM')
  await new Promise<void>((resolve) => {
    if (!emulator) {
      resolve()
      return
    }
    emulator.once('exit', () => resolve())
    setTimeout(() => {
      emulator?.kill('SIGKILL')
      resolve()
    }, 2000)
  })
  emulator = null
}

export default async function globalSetup() {
  await startEmulator()

  return async () => {
    await disconnectTestRdb()
    await stopEmulator()
  }
}
