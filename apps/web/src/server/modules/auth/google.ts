import * as oidc from 'openid-client'

import { env } from '~/env'

/**
 * Google OIDC (Authorization Code + PKCE) helpers shared by the login and
 * callback route handlers. Mirrors the Okta module — only the issuer and the
 * env var names differ.
 */

// Short-lived, httpOnly cookies that carry the per-login PKCE/state/nonce
// secrets between the /login redirect and the /callback exchange.
export const GOOGLE_VERIFIER_COOKIE = 'google.pkce-verifier'
export const GOOGLE_STATE_COOKIE = 'google.oauth-state'
export const GOOGLE_NONCE_COOKIE = 'google.oidc-nonce'

// Path the callback handler lives at. Must match an Authorized redirect URI
// registered on the Google OAuth client (prefixed by the current origin).
export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback'

export const GOOGLE_SCOPE = 'openid profile email'

interface GoogleEnv {
  issuer: string
  clientId: string
  clientSecret: string
}

/**
 * Returns the Google credentials, throwing a clear error if SSO is not
 * configured. Keeping the env vars optional means the rest of the app boots
 * without them; only the Google routes hard-fail.
 */
const getGoogleEnv = (): GoogleEnv => {
  const { GOOGLE_ISSUER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google SSO is not configured: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'
    )
  }
  return {
    issuer: GOOGLE_ISSUER,
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
  }
}

// Cache the discovery result across requests. Reset on failure so a transient
// discovery error doesn't poison every subsequent login.
let configPromise: Promise<oidc.Configuration> | undefined

export const getGoogleConfig = (): Promise<oidc.Configuration> => {
  if (!configPromise) {
    const { issuer, clientId, clientSecret } = getGoogleEnv()
    configPromise = oidc
      .discovery(new URL(issuer), clientId, clientSecret)
      .catch((err: unknown) => {
        configPromise = undefined
        throw err
      })
  }
  return configPromise
}

export const isGoogleConfigured = (): boolean =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
