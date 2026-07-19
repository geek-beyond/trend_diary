import { authInputSchema } from '@trend-diary/domain/account'
import zodValidator from '@/middleware/zod-validator'

// signup / login で同一スキーマを共有するため単一の validator を使い回す
export const authInputValidator = zodValidator('json', authInputSchema)
