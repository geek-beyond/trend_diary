import { hc } from 'hono/client'
import app from '@/server/route'

export const getApiClient = (url: string) => hc<typeof app>(`${url}/api`)
export default getApiClient
