import { createEnv } from '@t3-oss/env-core'
import z from 'zod'

export const env = createEnv({
  server: {
    // Full connection string (e.g. Upstash `rediss://default:<pw>@<host>:6379`).
    // Takes precedence over the CACHE_* fields when set; `rediss://` enables TLS.
    REDIS_URL: z.url().optional(),
    CACHE_HOSTNAME: z.string().trim().min(1).optional(),
    CACHE_PORT: z.coerce.number().default(6379).optional(),
    CACHE_USERNAME: z.string().optional(),
    CACHE_PASSWORD: z.string().optional(),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.npm_lifecycle_event === 'lint',
})
