const MAX_BODY_BYTES = 64 * 1024 // 64 KB — well above any legitimate API payload

export default defineEventHandler((event) => {
  if (!['POST', 'PUT', 'PATCH'].includes(event.node.req.method ?? '')) return

  const contentLength = Number(getRequestHeader(event, 'content-length'))
  if (contentLength && contentLength > MAX_BODY_BYTES) {
    throw createError({ statusCode: 413, message: 'Payload too large' })
  }
})
