import { SignInWizardProvider } from './context'
import { EmailFlow } from './email'
import { SignInWithGoogle } from './google'
import { SignInWithOkta } from './okta'

import { env } from '~/env'

// Login methods in priority order:
//   1. Email OTP — the primary path, the only one exposed in production
//   2. Google SSO  } shown in non-production environments only (their server
//   3. Okta SSO    } routes 404 in production too)
// The email flow needs `SignInWizardProvider` for its PKCE challenge + resend
// timer state; the SSO buttons just do a full-page redirect to their server
// routes, so they sit happily inside the same provider.
export const SignInWizard = () => {
  const ssoEnabled = env.NEXT_PUBLIC_APP_ENV !== 'production'

  return (
    <SignInWizardProvider>
      <div className="flex flex-1 flex-col gap-4">
        <EmailFlow />

        {ssoEnabled && (
          <>
            <div className="flex items-center gap-3" aria-hidden>
              <span className="border-base-divider-strong flex-1 border-t" />
              <span className="text-base-content-medium text-xs">or</span>
              <span className="border-base-divider-strong flex-1 border-t" />
            </div>

            <SignInWithGoogle />
            <SignInWithOkta />
          </>
        )}
      </div>
    </SignInWizardProvider>
  )
}
