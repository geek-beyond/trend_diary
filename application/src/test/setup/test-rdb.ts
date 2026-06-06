import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { setTestRdb } from '@/test/helper/rdb'
import { applyMigrationsToClient } from '@/test/setup/apply-migrations'

process.env.NODE_ENV = 'test'

const client = createClient({ url: ':memory:' })
await applyMigrationsToClient(client)
setTestRdb(drizzleLibsql(client, { schema }))
