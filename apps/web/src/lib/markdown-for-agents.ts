/**
 * Markdown for Agents — content negotiation.
 *
 * When a client sends `Accept: text/markdown` (and prefers it to HTML), we
 * serve a markdown rendition of select public pages instead of the HTML.
 * HTML stays the default for browsers. The `proxy.ts` middleware detects the
 * preference and rewrites to the `/api/markdown` route handler.
 *
 * Background: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 */

interface AcceptEntry {
  type: string
  q: number
}

function parseAccept(accept: string): AcceptEntry[] {
  return accept.split(',').map((part) => {
    const [rawType, ...params] = part.trim().split(';')
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
    const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1
    return {
      type: (rawType ?? '').trim().toLowerCase(),
      q: Number.isNaN(q) ? 1 : q,
    }
  })
}

/**
 * Returns true when the client explicitly accepts `text/markdown` and ranks it
 * at least as high as `text/html`. Browsers (which send `text/html,...` without
 * `text/markdown`) therefore keep getting HTML.
 */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false

  const entries = parseAccept(accept)
  const md = entries.find((e) => e.type === 'text/markdown')
  if (!md || md.q <= 0) return false

  const html = entries.find((e) => e.type === 'text/html')
  return !html || md.q >= html.q
}

/**
 * Markdown renditions keyed by request pathname. Keep these in sync with the
 * corresponding pages' visible content when copy changes.
 */
export const markdownDocuments: Record<string, string> = {
  '/': `# NUS Enterprise

> Build production ready applications in minutes.

StarterApp is our baseline application created by StarterKit. You can explore it to get a sense of basic functions and interactions.

[Explore StarterApp](/admin)

## Our application features

- **Example feature 1** — This is a description of one of the features in the application.
- **Example feature 2** — This is a description of one of the features in the application.
- **Example feature 3** — This is a description of one of the features in the application.

## Get started

Sign in with your email address and start building your app immediately. It's free, and requires no onboarding or approvals.

[Sign in](/sign-in)

## Everything you need to bring your venture to life

Explore the **NUS Enterprise ecosystem** — from incubation and mentorship to industry partnerships, discover the programmes and resources that help you build and scale.

[Visit NUS Enterprise](https://enterprise.nus.edu.sg/)
`,
}

/** Whether a markdown rendition exists for the given pathname. */
export function hasMarkdownVersion(pathname: string): boolean {
  return Object.hasOwn(markdownDocuments, pathname)
}
