export const extractIpAddress = (headers: Headers): string | null => {
  const forwarded =
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for') ??
    headers.get('x-real-ip')

  if (!forwarded) {
    return null
  }

  return forwarded.split(/, /)[0] ?? null
}

const SAFE_METHODS = new Set(['GET', 'HEAD'])
const TRUSTED_FETCH_SITES = new Set(['same-origin', 'none'])

export const isCrossSiteRequest = (request: Request): boolean => {
  if (SAFE_METHODS.has(request.method)) {
    return false
  }

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === null) {
    return false
  }

  return !TRUSTED_FETCH_SITES.has(fetchSite)
}
