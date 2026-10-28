import { isCrossSiteRequest } from '../request'

const buildRequest = (method: string, fetchSite?: string) =>
  new Request('http://localhost:3000/api/trpc/me.get', {
    method,
    headers: fetchSite ? { 'sec-fetch-site': fetchSite } : {},
  })

describe('isCrossSiteRequest', () => {
  it.each(['cross-site', 'same-site'])(
    'flags a POST with sec-fetch-site %s',
    (fetchSite) => {
      expect(isCrossSiteRequest(buildRequest('POST', fetchSite))).toBe(true)
    }
  )

  it.each(['same-origin', 'none'])(
    'allows a POST with sec-fetch-site %s',
    (fetchSite) => {
      expect(isCrossSiteRequest(buildRequest('POST', fetchSite))).toBe(false)
    }
  )

  it('allows a POST without sec-fetch-site from non-browser clients', () => {
    expect(isCrossSiteRequest(buildRequest('POST'))).toBe(false)
  })

  it.each(['GET', 'HEAD'])('allows a cross-site %s', (method) => {
    expect(isCrossSiteRequest(buildRequest(method, 'cross-site'))).toBe(false)
  })
})
