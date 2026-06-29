import * as oidc from 'openid-client'

import { env } from '~/env'

/**
 * Okta OIDC (Authorization Code + PKCE) helpers shared by the login and
 * callback route handlers.
 */

// Short-lived, httpOnly cookies that carry the per-login PKCE/state/nonce
// secrets between the /login redirect and the /callback exchange.
export const OKTA_VERIFIER_COOKIE = 'okta.pkce-verifier'
export const OKTA_STATE_COOKIE = 'okta.oauth-state'
export const OKTA_NONCE_COOKIE = 'okta.oidc-nonce'

// Path the callback handler lives at. Must match a Sign-in redirect URI
// registered on the Okta application (prefixed by the current origin).
export const OKTA_CALLBACK_PATH = '/api/auth/okta/callback'

export const OKTA_SCOPE = 'openid profile email'

interface OktaEnv {
  issuer: string
  clientId: string
  clientSecret: string
}

/**
 * Returns the Okta credentials, throwing a clear error if SSO is not
 * configured. Keeping the env vars optional means the rest of the app boots
 * without them; only the Okta routes hard-fail.
 */
const getOktaEnv = (): OktaEnv => {
  const { OKTA_ISSUER, OKTA_CLIENT_ID, OKTA_CLIENT_SECRET } = env
  if (!OKTA_ISSUER || !OKTA_CLIENT_ID || !OKTA_CLIENT_SECRET) {
    throw new Error(
      'Okta SSO is not configured: set OKTA_ISSUER, OKTA_CLIENT_ID and OKTA_CLIENT_SECRET'
    )
  }
  return {
    issuer: OKTA_ISSUER,
    clientId: OKTA_CLIENT_ID,
    clientSecret: OKTA_CLIENT_SECRET,
  }
}

// Cache the discovery result across requests. Reset on failure so a transient
// discovery error doesn't poison every subsequent login.
let configPromise: Promise<oidc.Configuration> | undefined

export const getOktaConfig = (): Promise<oidc.Configuration> => {
  if (!configPromise) {
    const { issuer, clientId, clientSecret } = getOktaEnv()
    configPromise = oidc
      .discovery(new URL(issuer), clientId, clientSecret)
      .catch((err: unknown) => {
        configPromise = undefined
        throw err
      })
  }
  return configPromise
}

export const isOktaConfigured = (): boolean =>
  Boolean(env.OKTA_ISSUER && env.OKTA_CLIENT_ID && env.OKTA_CLIENT_SECRET)
