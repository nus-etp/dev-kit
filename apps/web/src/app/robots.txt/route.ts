import { getSiteUrl } from '~/lib/site'

/**
 * Serves `/robots.txt` as plain text with full control over the body.
 *
 * We hand-author the text (rather than use Next's `app/robots.ts` metadata
 * route) because we emit non-standard directives that the typed
 * `MetadataRoute.Robots` shape does not model:
 *   - `Content-Signal:` content-usage preferences (https://contentsignals.org/)
 *   - explicit per-bot groups for named AI crawlers
 *
 * Policy: general crawlers may index public pages but content is opted OUT of
 * AI training and AI input/grounding; named AI crawlers are blocked entirely.
 *
 * Spec: RFC 9309 (Robots Exclusion Protocol).
 */

// AI crawlers blocked outright. Each gets its own `User-agent` group because
// the most-specific matching group wins per RFC 9309 — folding them into `*`
// would not override the `Allow` we grant general crawlers.
const BLOCKED_AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'Google-Extended',
  'PerplexityBot',
  'Perplexity-User',
  'CCBot',
  'Applebot-Extended',
  'Amazonbot',
  'Bytespider',
  'Meta-ExternalAgent',
  'meta-externalagent',
  'FacebookBot',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'Timpibot',
  'YouBot',
]

export function GET(): Response {
  const sitemapUrl = `${getSiteUrl()}/sitemap.xml`

  const lines = [
    '# robots.txt — NUS Enterprise',
    '# Robots Exclusion Protocol: https://www.rfc-editor.org/rfc/rfc9309',
    '',
    '# General crawlers: index public pages, but opt out of AI training and',
    '# AI input/grounding. Content signals per https://contentsignals.org/',
    'User-agent: *',
    'Content-Signal: search=yes, ai-train=no, ai-input=no',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    '# AI crawlers: blocked entirely.',
    ...BLOCKED_AI_CRAWLERS.flatMap((bot) => [
      `User-agent: ${bot}`,
      'Disallow: /',
      '',
    ]),
    `Sitemap: ${sitemapUrl}`,
    '',
  ]

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
