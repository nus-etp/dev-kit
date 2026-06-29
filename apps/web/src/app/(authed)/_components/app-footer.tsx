import Link from 'next/link'

import { WHATS_NEW_ROUTE } from '~/constants'
import { env } from '~/env'

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 px-4 py-3">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>{env.NEXT_PUBLIC_APP_NAME}</span>
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
