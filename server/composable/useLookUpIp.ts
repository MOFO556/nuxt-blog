export async function useLookUpIp(ip: string) {
  try {
    return await $fetch<{ city: string, country: string }>(
      `http://ip-api.com/json/${ip}?fields=city,country`,
      { timeout: 1500 },
    )
  }
  catch {
    return undefined
  }
}