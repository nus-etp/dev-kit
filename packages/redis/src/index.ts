import Redis from 'ioredis'

import { env } from './env'

const globalForRedis = global as unknown as {
  redis: ReturnType<typeof createRedisClient> | undefined
}

// Shared options regardless of whether we connect via URL or discrete fields.
const sharedOptions = {
  retryStrategy: (attempt: number) => {
    return Math.min(attempt * 100, 5000)
  },
  // Only reconnect when the error contains "READONLY"
  // during node failover, this is thrown: 149: -READONLY You can't write against a read only replica.
  reconnectOnError: (error: Error) => error.message.includes('READONLY'),
} as const

const createRedisClient = (): Redis | null => {
  if (!env.REDIS_URL && !env.CACHE_HOSTNAME) {
    console.warn(
      '!!!! Neither REDIS_URL nor CACHE_HOSTNAME is set, Redis client will not be created. !!!!'
    )
    return null
  }

  // Prefer a full connection string (e.g. Upstash). ioredis parses the URL and
  // automatically enables TLS for the `rediss://` scheme.
  const redisClient = env.REDIS_URL
    ? new Redis(env.REDIS_URL, sharedOptions)
    : new Redis({
        host: env.CACHE_HOSTNAME,
        port: env.CACHE_PORT,
        username: env.CACHE_USERNAME,
        password: env.CACHE_PASSWORD,
        ...sharedOptions,
      })

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err.message)
  })

  return redisClient
}

export const redis =
  globalForRedis.redis !== undefined
    ? globalForRedis.redis
    : createRedisClient()
