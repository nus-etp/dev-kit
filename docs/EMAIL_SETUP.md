# Email setup — *only if your app needs login*

> **Skip this entirely if your app has no login.** Most prototypes don't need
> one — your app works fine without it. Only follow these steps if your app has
> sign-in / members-only pages.

Your app sends login codes (OTPs) through a free service called **Resend**. You
create the account; **your admin adds the DNS records** for you. Here's exactly
what to do and what to send them.

---

## Step 1 — Create a free Resend account

Go to **[resend.com](https://resend.com)** and sign up. It's free and needs no
card.

## Step 2 — Add your app's domain

In Resend, open **Domains → Add Domain**, and type *exactly* the domain your
admin gave you for this app:

> `your-app-name.nusx.edu.sg`   ← use the exact name your admin gave you. No `https://`, no spaces.

## Step 3 — Copy the DNS records Resend shows you

Resend now shows a **table of 3–4 records** (each has a **Type**, a
**Name/Host**, and a **Value**; the `MX` row also has a **Priority**). Your admin
needs **all of them**. Please do **both**:

- 📸 **Screenshot the whole table**, and
- ✍️ **Paste the text values** using the template below.
  *(Screenshots alone are easy to mistype — the DKIM value is very long.)*

## Step 4 — Send it to your admin and wait

Send your admin the filled-in template + screenshot. They'll add the records and
tell you when it's verified (usually within an hour). **Don't click "Verify"
until they confirm.**

## Step 5 — Verify and create your key

Once your admin says go: in Resend click **Verify** (rows turn green ✅). Then go
to **API Keys → Create API Key**, set **Permission: Sending access**, and
**copy the key immediately** — Resend shows it only once.

## Step 6 — Send your admin the key

Paste it in your message to them and they'll wire it into your app. It's a
limited "sending only" key, so low risk — but send it in a **direct message**,
not a public channel.

---

## 📋 Copy this, fill it in, and send it to your admin

```
App name:
Domain I added in Resend:  ______________________.nusx.edu.sg

DNS records from Resend (copy every row):
1) Type: _____  Name/Host: _______________________  Value: _______________________  Priority: ____
2) Type: _____  Name/Host: _______________________  Value: _______________________  Priority: ____
3) Type: _____  Name/Host: _______________________  Value: _______________________  Priority: ____
4) Type: _____  Name/Host: _______________________  Value: _______________________  Priority: ____

Screenshot of the Resend records table: [attach]

(After my admin confirms it's verified:)
Resend API key:  re_________________________________
```

---

## For the admin (not the builder)

You'll add these to the `nusx.edu.sg` zone. What Resend typically generates —
sanity-check before adding:

| Type  | Name/Host (full, under `nusx.edu.sg`)      | Value                                   | Notes                     |
| ----- | ------------------------------------------- | --------------------------------------- | ------------------------- |
| `MX`  | `send.<app>.nusx.edu.sg`                    | `feedback-smtp.<region>.amazonses.com`  | has a **Priority** (~10)  |
| `TXT` | `send.<app>.nusx.edu.sg`                    | `v=spf1 include:amazonses.com ~all`     | SPF                       |
| `TXT` | `resend._domainkey.<app>.nusx.edu.sg`       | `p=MIGfMA0…` (long DKIM key)            | DKIM — this is the long one |
| `TXT` | `_dmarc.<app>.nusx.edu.sg`                  | `v=DMARC1; p=none;`                      | optional; Resend may include it |

Two gotchas: (1) Resend prefixes hosts with `send.` and `resend._domainkey.` —
add them as **full hostnames**; (2) rely on the **pasted text** for the DKIM
value, not the screenshot, so you don't transcribe it wrong.

Once verified, the builder's `RESEND_API_KEY` and
`RESEND_FROM="App Name <noreply@<app>.nusx.edu.sg>"` go into the app's Vercel
project env (see [SETUP.md](../SETUP.md)).
