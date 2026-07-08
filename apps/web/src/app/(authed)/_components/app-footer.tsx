import Image from 'next/image'
import Link from 'next/link'

import { WHATS_NEW_ROUTE } from '~/constants'
import { env } from '~/env'

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 px-4 py-3">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span className="flex flex-wrap items-center gap-1.5">
          Built with <span aria-hidden="true">❤️</span>
          <span className="sr-only">love</span> by
          <a
            href="https://enterprise.nus.edu.sg/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <Image
              src="/assets/nus-enterprise-logo.svg?v=3"
              alt="NUS Enterprise"
              width={114}
              height={25}
              className="inline-block h-4 w-auto"
            />
          </a>
        </span>
        <Link
          href={WHATS_NEW_ROUTE}
          className="font-medium text-gray-600 hover:text-gray-900 hover:underline"
        >
          v{env.NEXT_PUBLIC_APP_VERSION} · What&apos;s new
        </Link>
      </div>
    </footer>
  )
}
