import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

import * as oidc from 'openid-client'

import { env } from '~/env'
import { createLogger } from '~/lib/logger'
import {
  getOktaConfig,
  OKTA_CALLBACK_PATH,
  OKTA_NONCE_COOKIE,
  OKTA_SCOPE,
  OKTA_STATE_COOKIE,
  OKTA_VERIFIER_COOKIE,
} from '~/server/modules/auth/okta'
import { getBaseUrl } from '~/utils/get-base-url'

const cookieSecure = env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test'

// PKCE/state/nonce only need to survive the round-trip to Okta and back.
const tempCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10, // 10 minutes
}

/**
 * Kicks off the Okta OIDC Authorization Code (+ PKCE) flow: generates the
 * per-login secrets, stashes them in httpOnly cookies, and redirects the
 * browser to Okta's authorization endpoint.
 */
export async function GET(request: Request) {
  // SSO is a non-production option: only email OTP login is exposed in production.
  if (env.NEXT_PUBLIC_APP_ENV === 'production') {
    notFound()
  }

  const logger = createLogger({ path: 'okta-login', headers: request.headers })

  const config = await getOktaConfig()

  const codeVerifier = oidc.randomPKCECodeVerifier()
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier)
  const state = oidc.randomState()
  const nonce = oidc.randomNonce()

  const authUrl = oidc.buildAuthorizationUrl(config, {
    redirect_uri: `${getBaseUrl()}${OKTA_CALLBACK_PATH}`,
    scope: OKTA_SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })

  const cookieStore = await cookies()
  cookieStore.set(OKTA_VERIFIER_COOKIE, codeVerifier, tempCookieOptions)
  cookieStore.set(OKTA_STATE_COOKIE, state, tempCookieOptions)
  cookieStore.set(OKTA_NONCE_COOKIE, nonce, tempCookieOptions)

  logger.info({
    message: 'Redirecting to Okta for authorization',
    action: 'okta.login',
  })

  // redirect() throws NEXT_REDIRECT; the cookies set above are flushed with it.
  redirect(authUrl.href)
}
