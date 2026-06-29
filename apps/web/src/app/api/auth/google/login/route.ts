import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import * as oidc from 'openid-client'

import { env } from '~/env'
import { createLogger } from '~/lib/logger'
import {
  getGoogleConfig,
  GOOGLE_CALLBACK_PATH,
  GOOGLE_NONCE_COOKIE,
  GOOGLE_SCOPE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
} from '~/server/modules/auth/google'
import { getBaseUrl } from '~/utils/get-base-url'

const cookieSecure = env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test'

// PKCE/state/nonce only need to survive the round-trip to Google and back.
const tempCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10, // 10 minutes
}

/**
 * Kicks off the Google OIDC Authorization Code (+ PKCE) flow: generates the
 * per-login secrets, stashes them in httpOnly cookies, and redirects the
 * browser to Google's authorization endpoint.
 */
export async function GET(request: Request) {
  // SSO is a non-production option: only email OTP login is exposed in production.
  if (env.NEXT_PUBLIC_APP_ENV === 'production') {
    notFound()
  }

  const logger = createLogger({
    path: 'google-login',
    headers: request.headers,
  })

  const config = await getGoogleConfig()

  const codeVerifier = oidc.randomPKCECodeVerifier()
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier)
  const state = oidc.randomState()
  const nonce = oidc.randomNonce()

  const authUrl = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${getBaseUrl()}${GOOGLE_CALLBACK_PATH}`,
    scope: GOOGLE_SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })

  const cookieStore = await cookies()
  cookieStore.set(GOOGLE_VERIFIER_COOKIE, codeVerifier, tempCookieOptions)
  cookieStore.set(GOOGLE_STATE_COOKIE, state, tempCookieOptions)
  cookieStore.set(GOOGLE_NONCE_COOKIE, nonce, tempCookieOptions)

  logger.info({
    message: 'Redirecting to Google for authorization',
    action: 'google.login',
  })

  // redirect() throws NEXT_REDIRECT; the cookies set above are flushed with it.
  redirect(authUrl.href)
}
