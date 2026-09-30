export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('error', (err, ctx) => {
    if (ctx?.event?.path?.startsWith('/api/auth')) {} //stripping body from logs payload
  });
});