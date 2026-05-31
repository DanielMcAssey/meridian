import { z } from 'zod'
import { users } from '~/server/db/schema'
import { sanitizeName } from '~/utils/sanitizeName'
import { createRateLimiter } from '~/server/utils/rateLimit'
import { getClientIp } from '~/server/utils/getClientIp'
import { MAX_NAME_LENGTH } from '~/config/game'

const isRateLimited = createRateLimiter(5)

const bodySchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH).trim()
    .transform(sanitizeName)
    .refine((n) => n.length > 0, { message: 'Name is empty after sanitisation' }),
})

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  if (isRateLimited(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests — please wait a moment' })
  }

  const { name } = await readValidatedBody(event, bodySchema.parse)
  const db  = await getDb()
  const now = Math.floor(Date.now() / 1000)

  const userId       = crypto.randomUUID()
  const recoveryCode = crypto.randomUUID()

  await db.insert(users).values({ id: userId, name, recoveryCode, firstSeen: now, lastSeen: now })

  return { userId, recoveryCode }
})
