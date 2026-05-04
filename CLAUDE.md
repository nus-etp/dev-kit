# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

OGP Starter Kit — a Turborepo + pnpm monorepo (`@acme/*` workspace scope). Single Next.js 15 app (`apps/web`) using React 19, tRPC v11, Tailwind v4, Prisma 7 + Kysely on PostgreSQL, iron-session, Pino logging, and Redis. Shared packages live under `packages/*`; build/lint configs under `tooling/*`.

Node `>=24.13.0`, pnpm `>=10.17.1` (enforced via `engines`). Always use `pnpm` — never `npm`/`yarn`.

## Commands

Run from the repo root unless noted. All tasks fan out via Turbo.

```bash
pnpm i                        # install
docker compose up -d          # postgres on :54321, redis on :63791
cp .env.example .env          # then fill in
pnpm db:push                  # apply schema (dev)
pnpm dev                      # all dev servers, watch mode
pnpm dev:next                 # only the Next.js app + its deps
```

Quality gates:

```bash
pnpm lint        # eslint, cached at .cache/.eslintcache
pnpm lint:fix
pnpm format      # prettier check
pnpm format:fix
pnpm typecheck   # tsc --noEmit across workspaces
pnpm lint:ws     # sherif — workspace consistency (also runs postinstall)
pnpm build
```

Database (`packages/db`):

```bash
pnpm db:push                  # prisma db push (dev, no migration history)
pnpm db:migrate               # prisma migrate dev
pnpm db:deploy                # prisma migrate deploy (prod)
pnpm db:studio                # Prisma Studio on :5556
pnpm -F @acme/db generate     # regenerate Prisma client + Kysely types + Zod schemas
pnpm -F @acme/db seed
```

Tests — there are three test surfaces in `apps/web`:

```bash
pnpm test                                      # vitest in watch mode (turbo run test)
pnpm test:ci                                   # vitest run --coverage
pnpm -F @acme/web e2e                          # Playwright; spawns `pnpm dev-e2e` on :3111
pnpm -F @acme/web e2e:ui                       # Playwright UI mode
pnpm -F @acme/web storybook                    # :6006

# Run a single vitest file or pattern (note the `--` to forward args through turbo):
pnpm -F @acme/web test -- src/server/modules/auth/__tests__/auth.service.test.ts
pnpm -F @acme/web test -- -t "logs the user in"
```

Vitest globals are enabled (`describe`/`it`/`expect`/`vi` are ambient). Coverage only emits when `CI=true`.

Scaffold a new package: `pnpm turbo gen init` (templates in `turbo/generators/`).

## Architecture

### Monorepo layout

- `apps/web` — the only app. Next.js App Router with route groups `(authed)` and `(public)`; tRPC handler at `src/app/api/trpc`; auth callbacks at `src/app/api/auth`.
- `packages/db` — Prisma + Kysely + Zod. Multi-export package; consumers import `@acme/db`, `@acme/db/client`, `@acme/db/extensions`, `@acme/db/kysely`, `@acme/db/enums`, `@acme/db/browser`, `@acme/db/validators`. See `packages/db/README.md` for usage rules.
- `packages/redis`, `packages/logging`, `packages/common`, `packages/validators`, `packages/ui` — shared libs. `@acme/ui` builds on `@opengovsg/oui` + `react-aria-components`.
- `tooling/{eslint,prettier,tailwind,typescript,storybook,github}` — shared configs published as workspace packages (`@acme/eslint-config`, etc.).
- `turbo/generators` — plop-style generator backing `pnpm turbo gen init`.

### tRPC server (`apps/web/src/server`)

`api/trpc.ts` is the integration point. Every procedure goes through `defaultProcedure`, which chains:

1. `loggerMiddleware` — scopes the request logger by `path`, logs duration + status.
2. `rateLimitMiddleware` — reads `meta.rateLimitOptions` (defaults to `{}`; pass `null` to disable). Skipped when `NODE_ENV=test`. Fingerprint = ip + userId + path; backed by `rate-limiter-flexible` against Redis.
3. `authMiddleware` (only on `protectedProcedure`) — requires `ctx.session.userId`.

Routers live under `src/server/api/routers/`, business logic under `src/server/modules/<feature>/<feature>.service.ts`. Wire new routers into `src/server/api/root.ts`.

### Database client

`@acme/db` exports a single `db` = PrismaClient + `kyselyPrismaExtension`. Use Prisma for ordinary CRUD; reach for `db.$kysely` for complex SQL. **Do not call `db.$kysely.transaction()` directly** — wrap Kysely calls in `db.$transaction(...)` instead (the extension doesn't support Kysely-native transactions). For raw SQL, use `db.$queryRaw` / `db.$executeRaw` template tags so parameters are escaped — never string-concatenate user input. See `packages/db/README.md`.

After any change to `prisma/schema.prisma`, run `pnpm -F @acme/db generate` so the Prisma client, Kysely types, and Zod schemas all stay in sync. The generated output lives in `packages/db/src/generated/` — if it gets corrupt, delete that folder and regenerate.

### Sessions and auth

`iron-session` cookie-based sessions configured in `apps/web/src/server/session.ts`. `SessionData.userId` is the auth signal. Login flow is OTP-via-email through Postman (`POSTMAN_API_KEY`); without the key, OTPs are logged to the console.

### Environment variables

Validated with `@t3-oss/env-nextjs` + Zod in `apps/web/src/env.ts` and `packages/db/src/env.ts`. Client-exposed variables must be prefixed `NEXT_PUBLIC_` **and** explicitly listed in `experimental__runtimeEnv` in `env.ts` — otherwise Next.js will tree-shake them out of the client bundle. Validation is skipped during `lint` and when `SKIP_ENV_VALIDATION=1` (e.g. Storybook).

`turbo.json` lists `globalEnv` (DATABASE_URL, SESSION_SECRET, PORT, POSTMAN_API_KEY, DD_SERVICE) — adding a new env var consumed by Turbo tasks usually means updating that list too, otherwise cache keys won't reflect it.

### pnpm catalogs

Versions for shared deps are pinned in `pnpm-workspace.yaml` under `catalog:` and `catalogs:` (e.g. `catalog:react`, `catalog:trpc`, `catalog:prisma`). Reference them from package manifests as `"react": "catalog:react"` rather than hard-coding versions, so upgrades happen in one place. `minimumReleaseAge: 1440` enforces a 24-hour cooldown on new releases — bypass via `minimumReleaseAgeExclude` only for security fixes.

### Testing setup

`apps/web/vitest.config.ts` uses Testcontainers (`tests/global-setup.ts`) to boot ephemeral Postgres + Redis containers per run. `tests/db/setup.ts` creates a unique database per worker, applies migrations from `packages/db/prisma/migrations`, and `vi.mock`s `@acme/db` to point at it. Don't mock the database in tests that exercise services — hit the testcontainer.

Playwright e2e is separate: `pnpm -F @acme/web e2e` boots its own Next dev server via `dev-e2e` on :3111 with `.env.e2e`.

### Build pipeline

`turbo.json` defines task dependencies. Notable: `lint` and `typecheck` `dependsOn ["^topo", "^build"]`, so internal packages must build (or at least their `topo` placeholder runs) before downstream typechecking. `vercel-build` for the web app `dependsOn` `@acme/db#generate` and `@acme/db#migrate:deploy` — production builds will run migrations.
