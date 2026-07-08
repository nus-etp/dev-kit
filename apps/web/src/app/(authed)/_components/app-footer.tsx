import Image from 'next/image'
import Link from 'next/link'

import { WHATS_NEW_ROUTE } from '~/constants'
import { env } from '~/env'

const NUS_ENTERPRISE_URL = 'https://enterprise.nus.edu.sg/'

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 px-4 py-3">
      <div className="container mx-auto flex flex-col items-center gap-2 text-xs text-gray-500 sm:flex-row sm:justify-between">
        <span>{env.NEXT_PUBLIC_APP_NAME}</span>
        <span className="flex items-center gap-1">
          Built with{' '}
          <span role="img" aria-label="love">
            ❤️
          </span>{' '}
          by
          <a
            href={NUS_ENTERPRISE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 hover:underline"
          >
            <Image
              src="/assets/nus-crest.svg"
              alt="NUS Enterprise"
              width={12}
              height={16}
            />
            NUS Enterprise
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
