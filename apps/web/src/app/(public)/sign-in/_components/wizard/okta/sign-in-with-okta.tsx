'use client'

import { Button } from '@opengovsg/oui/button'
import { useQueryState } from 'nuqs'

import { OKTA_LOGIN_API_ROUTE } from '~/constants'

/**
 * Single-button entry point to the Okta OIDC flow. Clicking does a full-page
 * navigation to the server route that builds the authorization URL and
 * redirects to Okta — no client-side token handling.
 */
export const SignInWithOkta = () => {
  const [error] = useQueryState('error', { defaultValue: '' })

  return (
    <div className="flex flex-col gap-2">
      {error === 'okta' && (
        <p className="text-utility-feedback-critical text-sm" role="alert">
          Something went wrong signing in with Okta. Please try again.
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        onPress={() => {
          window.location.href = OKTA_LOGIN_API_ROUTE
        }}
      >
        Sign in with Okta
      </Button>
    </div>
  )
}
