import { env } from '~/env'

/**
 * Canonical, absolute origin of the deployed site, with any trailing slash
 * stripped. Used to build absolute URLs for robots.txt and the sitemap.
 *
 * Prefers `NEXT_PUBLIC_APP_URL` when configured; otherwise falls back to the
 * production domain (matches the `openGraph.url` in `app/layout.tsx`).
 */
const FALLBACK_SITE_URL = 'https://enterprise.nus.edu.sg'

export function getSiteUrl(): string {
  return (env.NEXT_PUBLIC_APP_URL ?? FALLBACK_SITE_URL).replace(/\/+$/, '')
}
