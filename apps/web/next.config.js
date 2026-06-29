import { readFileSync } from 'node:fs'

import { createJiti } from 'jiti'

// Single source of truth for the app version: the monorepo root package.json.
// Surfaced to the client as NEXT_PUBLIC_APP_VERSION (used by the version-check
// banner and the footer) unless explicitly overridden in the environment.
// The starter kit itself is intentionally unversioned — child apps add a
// `version` field (e.g. via the /release skill) and it flows through here.
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
)
if (version) process.env.NEXT_PUBLIC_APP_VERSION ||= version

const jiti = createJiti(import.meta.url)

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import('./src/env')

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    // Limits body size in our endpoints.
    // Only affects route matches in proxy.ts, so you must be careful to not remove matches in that file
    // or the limit can be bypassed and cause OOM server crashes.
    proxyClientMaxBodySize: '2mb',
  },
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    '@acme/db',
    '@acme/ui',
    '@acme/validators',
    '@acme/logging',
    '@acme/redis',
    '@acme/common',
  ],

  reactCompiler: true,

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  // If deploying to AWS, set deploymentId to a unique value for each deployment, e.g. from git sha or CI build number
  deploymentId: undefined,
  // If deploying to AWS, set output to 'standalone'
  output: undefined,
}

export default config
