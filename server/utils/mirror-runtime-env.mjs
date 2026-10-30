/**
 * Copy every non-empty env var onto NUXT_<NAME> when that key is unset
 */
export function mirrorAllEnvToNuxt(env = process.env) {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === '')
      continue
    if (key.startsWith('NUXT_') || key.startsWith('NITRO_'))
      continue
    const nuxtKey = `NUXT_${key}`
    if (!env[nuxtKey])
      env[nuxtKey] = value
  }
}

if (!process.env.VITEST)
  mirrorAllEnvToNuxt()