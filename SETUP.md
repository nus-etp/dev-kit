# Self-serve deployment setup

This template is wired so **non-technical staff can vibe-code an app and get a
live URL** without their own Vercel seat. Every app is its own repo (forked from
this template) but they all deploy through **one shared Vercel account** — kept
at a flat ~US$20/month — using **deploy hooks**, not Vercel's native Git
integration.

Why deploy hooks: Vercel's Git integration only deploys commits whose author is
a member of the Vercel team. On one shared seat that blocks everyone but the
owner. A deploy hook ignores commit-author identity, so **any username's push
deploys** under the shared account. That's why `vercel.json` sets
`git.deploymentEnabled: false` and `.github/workflows/deploy.yml` calls the hook.

---

## One-time platform setup (once, ever)

1. **GitHub org** to hold the app repos (e.g. `nus-etp-apps`).
2. **Shared Vercel Pro account** — the "deploy service" identity.
3. **Install the Vercel GitHub App** on the org (required for deploy hooks to exist).
4. **Set a hard spend cap** on the Vercel account (protects the flat $20).
5. **Neon account** for per-app databases (free tier, one DB per app).
6. **DNS control** of `nusx.edu.sg` (only needed for apps that send login email).

---

## Per-app setup (you run this once per new app)

You can use `scripts/create-app.sh` as a starting point, or do it by hand:

1. **Create the repo from this template**
   ```bash
   gh repo create nus-etp-apps/<app> --template nus-etp-apps/dev-kit --private
   ```
2. **Provision a database** (Neon) → copy its `DATABASE_URL`.
3. **Create the Vercel project**, Root Directory = `apps/web` (dashboard import,
   or `vercel link`). Then set env vars on the project:
   - `DATABASE_URL` — from Neon
   - `SESSION_SECRET` — `uuidgen` (or `pnpx uuid`)
   - `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`
   - **Only if the app has login:** `RESEND_API_KEY` + `RESEND_FROM`
     (see [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md))
4. **Create two deploy hooks** on the Vercel project:
   - `main` → production URL
   - `preview` → staging URL
5. **Store the hook URLs as repo secrets** (the workflow reads these):
   ```bash
   gh secret set VERCEL_DEPLOY_HOOK_MAIN    -R nus-etp-apps/<app> -b "<hook-main>"
   gh secret set VERCEL_DEPLOY_HOOK_PREVIEW -R nus-etp-apps/<app> -b "<hook-preview>"
   ```
6. **Hand the repo to the builder.** They vibe-code, push to `preview` to get a
   staging URL, then to `main` to go live.

---

## What the builder does after that

- Push to **`preview`** → GitHub Action → deploy hook → **staging URL** to share.
- Push to **`main`** → **production URL**. Live.
- Any commit author works; no Vercel login or seat needed.

## Notes & guardrails

- **Non-sensitive data only.** No PDPA-regulated personal data, financials, or
  HR data. Sign-in is already domain-locked to nus / nusx / a5x
  (`apps/web/src/validators/email.ts`).
- **Schema changes deploy automatically.** `vercel-build` runs `prisma db push`
  (see `packages/db` `push:deploy`), so editing `prisma/schema.prisma` and
  pushing is enough — no migration files to author. Trade-off: `db push` is for
  prototypes (it can drop columns on destructive changes); graduate to
  `migrate:deploy` for anything that holds real data.
- **No per-PR previews.** Deploy hooks are branch-fixed, so you get one `main`
  (prod) + one `preview` (staging) URL per app. That's the intended scope.
- **Auth is optional.** Apps with no login live entirely in the `(public)` route
  group and need no Resend setup at all.
