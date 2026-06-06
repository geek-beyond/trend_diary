import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export default function globalSetup(): void {
  execSync('pnpm run d1:apply:local', { cwd: APP_ROOT, stdio: 'inherit' })
}
