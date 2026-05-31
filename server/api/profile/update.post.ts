import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '~/server/db/schema'
import { validateRecoveryCode } from '~/server/utils/validateRecoveryCode'
import { createRateLimiter } from '~/server/utils/rateLimit'
import { getClientIp } from '~/server/utils/getClientIp'
import { MAX_BIO_LENGTH, MAX_NAME_LENGTH } from '~/config/game'
import { sanitizeName } from '~/utils/sanitizeName'

const isRateLimited = createRateLimiter(10)

const bodySchema = z.object({
  userId:       z.string().uuid(),
  recoveryCode: z.string().uuid(),
  name:         z.string().min(1).max(MAX_NAME_LENGTH).trim().transform(sanitizeName)
                  .refine((n) => n.length > 0, { message: 'Name is empty after sanitisation' })
                  .optional(),
  bio:          z.string().max(MAX_BIO_LENGTH).nullable().optional(),
  countryCode:  z.string().regex(/^[a-zA-Z]{2}$/).transform(v => v.toLowerCase()).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)

  if (isRateLimited(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests — please wait a moment' })
  }

  const { userId, recoveryCode, name, bio, countryCode } = await readValidatedBody(event, bodySchema.parse)
  const db = await getDb()

  await validateRecoveryCode(db, userId, recoveryCode, ip, 'profile:update')

  const fields = {
    ...(name        !== undefined ? { name }        : {}),
    ...(bio         !== undefined ? { bio }         : {}),
    ...(countryCode !== undefined ? { countryCode } : {}),
  }
  if (Object.keys(fields).length > 0) {
    await db.update(users).set(fields).where(eq(users.id, userId))
  }

  return { ok: true }
})
