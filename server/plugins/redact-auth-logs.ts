const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
])

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('error', (_err, ctx) => {
    const path = ctx?.event?.path
    if (!path?.startsWith('/api/auth'))
      return

    const event = ctx.event
    if (!event)
      return

    if (event.node?.req) {
      const req = event.node.req as typeof event.node.req & { body?: unknown }
      if ('body' in req)
        req.body = undefined
    }

    const headers = event.node?.req?.headers
    if (headers) {
      for (const key of Object.keys(headers)) {
        if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase()))
          headers[key] = '[redacted]'
      }
    }
  })
})
