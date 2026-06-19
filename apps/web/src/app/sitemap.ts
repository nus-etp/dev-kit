import type { MetadataRoute } from 'next'

import { getSiteUrl } from '~/lib/site'

/**
 * Generates `/sitemap.xml` listing canonical, publicly crawlable URLs.
 *
 * Authed routes (`/admin`) and API endpoints are intentionally excluded — they
 * are disallowed in robots.txt and carry no indexable content. Add new public
 * pages here as they ship so the sitemap stays current on publish.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()

  return [
    {
      url: `${base}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/sign-in`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
