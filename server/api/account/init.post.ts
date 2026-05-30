import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '~/server/db/schema'
import { createRateLimiter } from '~/server/utils/rateLimit'
import { getClientIp } from '~/server/utils/getClientIp'

const isRateLimited = createRateLimiter(5)

const bodySchema = z.object({
  userId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)

  if (isRateLimited(ip)) {
    console.warn('[account:init] rate limited', { ip })
    throw createError({ statusCode: 429, message: 'Too many requests — please wait a moment' })
  }

  const { userId } = await readValidatedBody(event, bodySchema.parse)
  const db = await getDb()

  const row = await db.select({ id: users.id, recoveryCode: users.recoveryCode })
    .from(users)
    .where(eq(users.id, userId))

  if (!row[0]) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Already has a code — do not return or regenerate it
  if (row[0].recoveryCode) {
    setResponseStatus(event, 204)
    return null
  }

  const recoveryCode = crypto.randomUUID()
  await db.update(users)
    .set({ recoveryCode })
    .where(eq(users.id, userId))

  console.log('[account:init] recovery code generated', { userId, ip })
  return { recoveryCode }
})
