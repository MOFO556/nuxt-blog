export function useLookUpIp(ip: string) {
  return $fetch<{city: string, country: string}>(`http://ip-api.com/json/${ip}?fields=city,country`)
}