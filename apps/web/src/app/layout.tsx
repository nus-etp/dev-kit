import type { Metadata } from 'next'

import { headers } from 'next/headers'

import { Toaster } from '@opengovsg/oui'
import { cn } from '@opengovsg/oui-theme'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import '~/app/globals.css'
import NextTopLoader from 'nextjs-toploader'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { ClientProviders } from './provider'

import { env } from '~/env'
import { ibmPlexMono, inter } from '~/lib/fonts'

export const metadata: Metadata = {
  title: env.NEXT_PUBLIC_APP_NAME,
  description: 'NUS Enterprise web application',
  openGraph: {
    title: env.NEXT_PUBLIC_APP_NAME,
    description: 'NUS Enterprise web application',
    url: 'https://enterprise.nus.edu.sg',
    siteName: env.NEXT_PUBLIC_APP_NAME,
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  // Touching headers() opts every route out of static prerendering, so Next
  // re-renders per request and its auto-injected inline scripts always carry the
  // live CSP nonce minted in proxy.ts. The idiomatic alternative to a blunt
  // app-wide `export const dynamic`.
  //
  // We deliberately do NOT forward the nonce to NextTopLoader: its only nonce
  // target is an inline <style>, which `style-src 'unsafe-inline'` already allows.
  // Putting a nonce there buys no security and triggers a hydration mismatch —
  // browsers clear the nonce content attribute from the DOM after parsing, so the
  // hydrating client tree never matches the server HTML.
  await headers()

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'text-base-content-default font-sans antialiased',
          inter.variable,
          ibmPlexMono.variable
        )}
      >
        <NextTopLoader color="var(--color-interaction-main-default)" />
        <ClientProviders>
          <NuqsAdapter>{props.children}</NuqsAdapter>
          <ReactQueryDevtools initialIsOpen={false} />
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  )
}
