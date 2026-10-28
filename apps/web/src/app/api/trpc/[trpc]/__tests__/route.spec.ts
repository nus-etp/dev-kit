import { NextRequest } from 'next/server'

import * as route from '../route'

const buildPost = (fetchSite: string) =>
  new NextRequest('http://localhost:3000/api/trpc/me.get', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'sec-fetch-site': fetchSite,
    },
    body: '{}',
  })

describe('tRPC route', () => {
  it('rejects a cross-site POST with 403', async () => {
    const response = await route.POST(buildPost('same-site'))

    expect(response.status).toBe(403)
  })

  it('passes a same-origin POST through to tRPC', async () => {
    const response = await route.POST(buildPost('same-origin'))

    expect(response.status).not.toBe(403)
  })

  it('does not advertise CORS', async () => {
    const response = await route.POST(buildPost('same-origin'))

    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(route).not.toHaveProperty('OPTIONS')
  })
})
