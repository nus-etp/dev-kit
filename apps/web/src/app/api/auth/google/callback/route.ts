import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import * as oidc from 'openid-client'

import { AUTHED_ROOT_ROUTE, LOGIN_ROUTE } from '~/constants'
import { createLogger } from '~/lib/logger'
import {
  getGoogleConfig,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
} from '~/server/modules/auth/google'
import { loginUserByGoogle } from '~/server/modules/user/user.service'
import { getSession } from '~/server/session'

const LOGIN_ERROR_ROUTE = `${LOGIN_ROUTE}?error=google`

/**
 * Handles the redirect back from Google: validates state/nonce, exchanges the
 * authorization code for tokens (PKCE), upserts the user from the verified
 * id_token claims, and starts an iron-session.
 */
export async function GET(request: Request) {
  const logger = createLogger({
    path: 'google-callback',
    headers: request.headers,
  })

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get(GOOGLE_VERIFIER_COOKIE)?.value
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value
  const expectedNonce = cookieStore.get(GOOGLE_NONCE_COOKIE)?.value

  const clearTempCookies = () => {
    cookieStore.delete(GOOGLE_VERIFIER_COOKIE)
    cookieStore.delete(GOOGLE_STATE_COOKIE)
    cookieStore.delete(GOOGLE_NONCE_COOKIE)
  }

  let destination = AUTHED_ROOT_ROUTE
  try {
    if (!codeVerifier || !expectedState || !expectedNonce) {
      throw new Error('Missing Google login cookies (expired or tampered)')
    }

    const config = await getGoogleConfig()
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
      throw new Error('Google id_token is missing required sub/email claims')
    }
    const name = typeof claims.name === 'string' ? claims.name : null

    const user = await loginUserByGoogle({ sub: claims.sub, email, name })

    const session = await getSession()
    session.userId = user.id
    await session.save()

    logger.info({
      message: 'Google login succeeded',
      action: 'google.callback',
      context: { userId: user.id },
    })
  } catch (err) {
    logger.error({
      message: 'Google login failed',
      action: 'google.callback',
      error: err,
    })
    destination = LOGIN_ERROR_ROUTE
  }

  clearTempCookies()
  // redirect() throws NEXT_REDIRECT; pending cookie writes are flushed with it.
  redirect(destination)
}
