# MIGRATE_TO_BUN — TODO

Tracking the work needed to evaluate / migrate this monorepo from Node 24 to Bun.
Status: **not started** — exploratory.

Current runtime: Node `>=24.13.0` (`package.json`, `.nvmrc`), pnpm `10.17.1`, deployed to Vercel (Node).

## Decisions to make first
- [ ] Scope: full swap (Node → Bun everywhere) **or** narrow swap (Bun as script/dev runner only, keep Node for CI/prod)?
- [ ] Keep pnpm + catalogs, or migrate to `bun install` workspaces? (Recommend: keep pnpm — see below.)
- [ ] Accept losing Datadog APM on Bun, or keep prod on Node? (Recommend: keep prod on Node until `dd-trace` supports Bun.)

## Blockers / high-risk items
- [ ] **`dd-trace`** (`packages/logging`, `apps/web/src/instrumentation.ts`) — Bun not officially supported by Datadog tracer. Decide: drop APM on Bun, or keep Node in prod.
- [ ] **Vercel deploys on Node**, not Bun (`apps/web/vercel.json`, `vercel-build` script). Migrating local dev to Bun while prod stays Node = two runtimes to debug.
- [ ] **Prisma 7 + `@prisma/adapter-pg`** (`packages/db`) — validate `db:push`, `db:migrate`, `db:studio`, `migrate:deploy` under Bun. Prisma 7 + pg driver adapter is the most Bun-friendly config, but engine/native-binding edge cases remain.
- [ ] **pnpm catalogs** (`pnpm-workspace.yaml:6-68`) — heavily used (`catalog:next`, `catalog:prisma`, etc.). Bun catalog support is newer; rewriting risks churn. Prefer keeping pnpm.

## Test/tooling stack to validate
- [ ] **Vitest 4** + `@vitest/browser-playwright` — runs under Bun, but `bun test` is a separate runner; keep Vitest invoked via Node initially.
- [ ] **Storybook 10** + `@storybook/nextjs-vite` + `storybook-addon-vitest` — Vite/Vitest stack assumes Node.
- [ ] **MSW** + `msw-storybook-addon` + `msw-trpc` — service worker setup; verify under Bun.
- [ ] **testcontainers** — Node-centric; verify Docker integration tests still pass.
- [ ] **Playwright** — should be fine, verify.
- [ ] **ESLint 9 / Prettier / Turbo 2** — all run on Bun, no speed win expected.

## Apps / packages to smoke-test
- [ ] `apps/web` — `bun run next dev` (Turbopack still bundles; Bun is just runtime). Validate React Compiler, `proxyClientMaxBodySize`, iron-session, nextjs-toploader, nuqs.
- [ ] `apps/web/src/proxy.ts`, `src/env.ts`, `src/instrumentation.ts` — Node API usage.
- [ ] `packages/db` — Prisma client + adapter-pg + kysely extension.
- [ ] `packages/redis` — verify redis client behavior on Bun.
- [ ] `packages/logging` — pino + pino-pretty (OK on Bun); dd-trace (NOT OK on Bun).

## Spike ideas (cheap experiments before committing)
- [ ] Spike 1: `bun run next dev` against `apps/web` on a branch — does the dev loop work end-to-end?
- [ ] Spike 2: `bun run` Prisma migrate against a local Postgres — does the engine load?
- [ ] Spike 3: Run one Vitest suite under Bun via `bun --bun vitest run` — does the browser/jsdom path survive?

## Out of scope (don't touch)
- Turbopack — already the bundler, unaffected by runtime choice.
- Next.js / React versions.
- Catalog dependency versions.

## Recommendation (from initial eval)
A full Node→Bun swap is **not** worth it given the dd-trace + Vercel-on-Node + catalog constraints. Two pragmatic narrow paths:
1. **Bun as a script runner** for one-off scripts and local `next dev` — low risk, modest startup gain.
2. **Bun as package manager for CI install speed** — fights catalog setup, not recommended yet.

Revisit when: (a) Datadog ships official Bun support, (b) Vercel offers a Bun runtime for Next.js, or (c) Prisma publishes first-class Bun support.
