import { env } from '~/env'

/**
 * Sends a transactional email via Resend (https://resend.com).
 *
 * Requires RESEND_API_KEY and RESEND_FROM to be set. If RESEND_API_KEY is
 * missing (e.g. local dev, or a no-auth prototype), the mail is logged to the
 * console instead of sent — the same fallback the Postman implementation had.
 *
 * `body` is sent as HTML (the OTP template uses <b>/<p>), so pass HTML here.
 */
export const sendMail = async (params: {
  recipient: string
  body: string
  subject: string
}): Promise<void> => {
  if (env.RESEND_API_KEY) {
    if (!env.RESEND_FROM) {
      throw new Error(
        'RESEND_API_KEY is set but RESEND_FROM is missing. Set RESEND_FROM to a verified sender, e.g. "App Name <noreply@your-app.nusx.edu.sg>".'
      )
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: params.recipient,
        subject: params.subject,
        html: params.body,
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `Resend error! status: ${response.status} ${response.statusText} ${detail}`
      )
    }

    return
  }

  console.warn(
    '!!!! This should not be seen on prod !!!! RESEND_API_KEY missing. Logging the following mail: ',
    params
  )
  return
}
