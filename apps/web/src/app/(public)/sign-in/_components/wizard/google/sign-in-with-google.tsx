'use client'

import { Button } from '@opengovsg/oui/button'
import { useQueryState } from 'nuqs'

import { GOOGLE_LOGIN_API_ROUTE } from '~/constants'

/**
 * Single-button entry point to the Google OIDC flow. Clicking does a full-page
 * navigation to the server route that builds the authorization URL and
 * redirects to Google — no client-side token handling.
 */
export const SignInWithGoogle = () => {
  const [error] = useQueryState('error', { defaultValue: '' })

  return (
    <div className="flex flex-col gap-2">
      {error === 'google' && (
        <p className="text-utility-feedback-critical text-sm" role="alert">
          Something went wrong signing in with Google. Please try again.
        </p>
      )}

      <Button
        size="sm"
        variant="outline"
        onPress={() => {
          window.location.href = GOOGLE_LOGIN_API_ROUTE
        }}
      >
        Sign in with Google
      </Button>
    </div>
  )
}
