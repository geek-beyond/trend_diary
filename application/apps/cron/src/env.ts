import type { WorkerBindings } from '@trend-diary/runtime/env'

export type FetchEnv = Pick<WorkerBindings, 'DB' | 'LOG_LEVEL'>

export type CronEnv = WorkerBindings
