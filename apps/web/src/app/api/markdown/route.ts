import type { NextRequest } from 'next/server'

import {
  hasMarkdownVersion,
  markdownDocuments,
} from '~/lib/markdown-for-agents'

/**
 * Serves the markdown rendition of a public page. Not meant to be hit directly
 * by browsers — `proxy.ts` rewrites here when a client negotiates
 * `Accept: text/markdown`, passing the original pathname as `?path=`.
 */
export function GET(req: NextRequest): Response {
  const path = req.nextUrl.searchParams.get('path') ?? '/'

  if (!hasMarkdownVersion(path)) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const body = markdownDocuments[path] ?? ''

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // Rough token estimate (~4 chars/token) to help agents budget context.
      'x-markdown-tokens': String(Math.ceil(body.length / 4)),
      // Same URL serves HTML or markdown depending on Accept — let caches vary.
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
