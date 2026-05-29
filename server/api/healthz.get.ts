import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  try {
    const db = await getDb()
    await db.run(sql`SELECT 1`)
    return { status: 'ok' }
  } catch (e) {
    throw createError({
      statusCode: 503,
      message: `Database unavailable: ${e instanceof Error ? e.message : String(e)}`,
    })
  }
})
