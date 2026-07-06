'use client'

import Image from 'next/image'

import { SignInWizard } from './wizard'

import { env } from '~/env'

/**
 * Exported for testing.
 */
export const SignInPageComponent = () => {
  return (
    <div className="lg:from-interaction-main-subtle-default flex flex-1 lg:bg-linear-to-r lg:from-50% lg:to-white lg:to-50%">
      <div className="mx-auto flex flex-1 flex-col gap-2 lg:container lg:grid lg:grid-cols-12 lg:gap-4">
        <div className="bg-interaction-main-subtle-default col-span-4 flex min-h-55 items-center max-sm:hidden lg:col-span-7 lg:h-full">
          <div className="max-w-xl px-4 lg:px-12">
            <h1 className="prose-responsive-display-heavy text-base-content-brand font-semibold">
              Welcome to {env.NEXT_PUBLIC_APP_NAME}.
            </h1>
            <p className="prose-body-1 text-base-content-default mt-4">
              Sign in to your account to get started.
            </p>
          </div>
        </div>
        <div className="mt-8 flex-1 grid-cols-12 md:grid lg:col-span-3 lg:col-start-9 lg:mt-[40%] lg:flex">
          <div className="flex h-full w-full flex-col gap-4 max-lg:px-4 md:col-span-6 md:col-start-4">
            <Image
              src="/assets/nusx-logo.svg"
              alt={env.NEXT_PUBLIC_APP_NAME}
              width={161}
              height={50}
              className="h-10 w-auto"
              priority
            />
            <h2 className="prose-h3 text-base-content-brand font-semibold">
              {env.NEXT_PUBLIC_APP_NAME}
            </h2>
            <SignInWizard />
          </div>
        </div>
      </div>
    </div>
  )
}
