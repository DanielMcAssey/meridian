import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '~/server/db/schema'
import { validateRecoveryCode } from '~/server/utils/validateRecoveryCode'
import { createRateLimiter } from '~/server/utils/rateLimit'
import { getClientIp } from '~/server/utils/getClientIp'
import { MAX_BIO_LENGTH } from '~/config/game'

const isRateLimited = createRateLimiter(10)

const bodySchema = z.object({
  userId:       z.string().uuid(),
  recoveryCode: z.string().uuid(),
  bio:          z.string().max(MAX_BIO_LENGTH).nullable(),
  countryCode:  z.string().regex(/^[A-Z]{2}$/).nullable(),
})

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)

  if (isRateLimited(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests — please wait a moment' })
  }

  const { userId, recoveryCode, bio, countryCode } = await readValidatedBody(event, bodySchema.parse)
  const db = await getDb()

  await validateRecoveryCode(db, userId, recoveryCode, ip, 'profile:update')

  await db.update(users)
    .set({ bio, countryCode })
    .where(eq(users.id, userId))

  return { ok: true }
})
