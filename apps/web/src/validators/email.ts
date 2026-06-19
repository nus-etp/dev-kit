import { parseOneAddress } from 'email-addresses'
import z from 'zod'

export const emailSchema = z
  .string()
  .min(1, 'Please enter an email address.')
  // https://www.rfc-editor.org/rfc/rfc5321#section-4.5.3.1.3 defines that emails should not be more than 256
  // z.email doesn't have a maximum either, this may cause the regex to try eval-ing a very large payload
  .max(256, 'Please enter a valid email address.')
  .check(
    z.trim(),
    z.email({ error: 'Please enter a valid email address.' }),
    z.toLowerCase()
  )

// Domains permitted to sign in. Matches the domain itself and any subdomain
// (e.g. `nus.edu.sg` matches `u.nus.edu.sg`).
const ALLOWED_EMAIL_DOMAINS = ['nus.edu.sg', 'nusx.edu.sg', 'a5x.ai']

export const nusEmailSchema = emailSchema.refine(
  (email) => {
    const parsedEmail = parseOneAddress(email)
    // Should not happen due to emailSchema validation
    if (!parsedEmail || parsedEmail.type === 'group') return false
    return ALLOWED_EMAIL_DOMAINS.some(
      (domain) =>
        parsedEmail.domain === domain ||
        parsedEmail.domain.endsWith(`.${domain}`)
    )
  },
  { error: 'Please enter a valid NUS email address.' }
)
