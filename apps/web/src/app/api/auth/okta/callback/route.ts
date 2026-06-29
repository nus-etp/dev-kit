import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import * as oidc from 'openid-client'

import { AUTHED_ROOT_ROUTE, LOGIN_ROUTE } from '~/constants'
import { createLogger } from '~/lib/logger'
import {
  getOktaConfig,
  OKTA_NONCE_COOKIE,
  OKTA_STATE_COOKIE,
  OKTA_VERIFIER_COOKIE,
} from '~/server/modules/auth/okta'
import { loginUserByOkta } from '~/server/modules/user/user.service'
import { getSession } from '~/server/session'

const LOGIN_ERROR_ROUTE = `${LOGIN_ROUTE}?error=okta`

/**
 * Handles the redirect back from Okta: validates state/nonce, exchanges the
 * authorization code for tokens (PKCE), upserts the user from the verified
 * id_token claims, and starts an iron-session.
 */
export async function GET(request: Request) {
  const logger = createLogger({
    path: 'okta-callback',
    headers: request.headers,
  })

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get(OKTA_VERIFIER_COOKIE)?.value
  const expectedState = cookieStore.get(OKTA_STATE_COOKIE)?.value
  const expectedNonce = cookieStore.get(OKTA_NONCE_COOKIE)?.value

  const clearTempCookies = () => {
    cookieStore.delete(OKTA_VERIFIER_COOKIE)
    cookieStore.delete(OKTA_STATE_COOKIE)
    cookieStore.delete(OKTA_NONCE_COOKIE)
  }

  let destination = AUTHED_ROOT_ROUTE
  try {
    if (!codeVerifier || !expectedState || !expectedNonce) {
      throw new Error('Missing Okta login cookies (expired or tampered)')
    }

    const config = await getOktaConfig()
    const tokens = await oidc.authorizationCodeGrant(
      config,
      new URL(request.url),
      {
        pkceCodeVerifier: codeVerifier,
        expectedState,
        expectedNonce,
      }
    )

    const claims = tokens.claims()
    const email = typeof claims?.email === 'string' ? claims.email : undefined
    if (!claims?.sub || !email) {
      throw new Error('Okta id_token is missing required sub/email claims')
    }
    const name = typeof claims.name === 'string' ? claims.name : null

    const user = await loginUserByOkta({ sub: claims.sub, email, name })

    const session = await getSession()
    session.userId = user.id
    await session.save()

    logger.info({
      message: 'Okta login succeeded',
      action: 'okta.callback',
      context: { userId: user.id },
    })
  } catch (err) {
    logger.error({
      message: 'Okta login failed',
      action: 'okta.callback',
      error: err,
    })
    destination = LOGIN_ERROR_ROUTE
  }

  clearTempCookies()
  // redirect() throws NEXT_REDIRECT; pending cookie writes are flushed with it.
  redirect(destination)
}
