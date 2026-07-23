import { hc } from 'hono/client'
import type app from '@/server/route'

const getApiClient = (url: string) => hc<typeof app>(`${url}/api`)
export default getApiClient
