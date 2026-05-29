import { getDb } from '~/server/utils/db'

// Pre-warm the database connection and run migrations before the first
// request arrives.  On Vercel cold starts, request handlers call getDb()
// themselves as a fallback — this plugin just makes the common case faster.
export default defineNitroPlugin(async () => {
  await getDb()
})
