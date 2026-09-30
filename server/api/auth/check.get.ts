export default defineEventHandler(async event => {
  const { user } = await requireAuth(event).catch(() => {
    return { user: null};
  });
  
  if (!user)
    return {
      auth: false
    }
  else {
    return { auth: true, user: user};
  }
})