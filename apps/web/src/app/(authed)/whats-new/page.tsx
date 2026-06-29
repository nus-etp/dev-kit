import type { Metadata } from 'next'

import { RELEASE_NOTES } from './release-notes'
import type { ReleaseSection } from './release-notes'

import { env } from '~/env'

export const metadata: Metadata = {
  title: "What's new",
}

// Tailwind classes per changelog category, falling back to neutral for any
// section the changelog might add later (Changed, Deprecated, Removed, …).
const SECTION_STYLES: Record<string, string> = {
  Added: 'bg-green-100 text-green-800',
  Changed: 'bg-blue-100 text-blue-800',
  Fixed: 'bg-amber-100 text-amber-800',
  Security: 'bg-red-100 text-red-800',
  Removed: 'bg-gray-200 text-gray-800',
  Deprecated: 'bg-gray-200 text-gray-800',
}

function SectionLabel({ title }: { title: ReleaseSection['title'] }) {
  const className = SECTION_STYLES[title] ?? 'bg-gray-200 text-gray-800'
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {title}
    </span>
  )
}

export default function WhatsNewPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">What&apos;s new</h1>
        <p className="text-sm text-gray-500">
          Release notes for {env.NEXT_PUBLIC_APP_NAME}. You are running version{' '}
          {env.NEXT_PUBLIC_APP_VERSION}.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {RELEASE_NOTES.map((release) => (
          <section key={release.version} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-gray-200 pb-2">
              <h2 className="text-xl font-semibold">v{release.version}</h2>
              <time className="text-sm text-gray-500" dateTime={release.date}>
                {release.date}
              </time>
            </div>

            {release.summary && (
              <p className="text-sm text-gray-700">{release.summary}</p>
            )}

            {release.sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-2">
                <SectionLabel title={section.title} />
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
