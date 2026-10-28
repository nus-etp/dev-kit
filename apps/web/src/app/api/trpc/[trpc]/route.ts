import type { NextRequest } from 'next/server'

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { APP_VERSION_HEADER_KEY } from '~/constants'
import { env } from '~/env'
import { appRouter } from '~/server/api/root'
import { createTRPCContext } from '~/server/api/trpc'
import { isCrossSiteRequest } from '~/server/utils/request'

const handler = async (req: NextRequest) => {
  if (isCrossSiteRequest(req)) {
    return new Response('Forbidden', { status: 403 })
  }

  const response = await fetchRequestHandler({
    endpoint: '/api/trpc',
    router: appRouter,
    req,
    allowBatching: false,
    createContext: ({ resHeaders }) =>
      createTRPCContext({
        headers: req.headers,
        resHeaders,
      }),
    onError({ error, path, ctx }) {
      if (error.code === 'UNAUTHORIZED') {
        ctx?.session.destroy()
      }
      console.error(`>>> tRPC Error on '${path}'`, error)
    },
  })

  if (env.NEXT_PUBLIC_APP_VERSION) {
    response.headers.set(APP_VERSION_HEADER_KEY, env.NEXT_PUBLIC_APP_VERSION)
  }
  return response
}

export { handler as GET, handler as POST }
