export default defineEventHandler(async (event) => {
  const token = getRequestHeader(event, 'authorization')
  if (token !== `Bearer ${process.env.ADMIN_TOKEN}`)
    throw createError({ statusCode: 401 })

  const { result } = await runTask('posts:enrich', { payload: { limit: 25 } })
  return result
})