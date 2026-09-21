export default defineEventHandler(async (event) => {
  const storage = useStorage('telemetry');
  await storage.setItem(`request:${Date.now()}`, {
    url: getRequestURL(event),
    method: event.method,
    headers: getRequestHeaders(event),
  });
});