import { parseOneAddress } from 'email-addresses'

import type { Logger } from '@acme/logging'

import { db } from '@acme/db'

import { AccountProvider } from '../auth/auth.constants'
import { defaultUserSelect } from './user.select'

export const loginUserByEmail = async (email: string, logger?: Logger) => {
  const parsedEmail = parseOneAddress(email)
  if (!parsedEmail || parsedEmail.type === 'group') {
    throw new Error('Invalid email address')
  }

  const { user, isNewUser } = await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    })

    const user = await tx.user.upsert({
      where: { email },
      update: {
        lastLogin: new Date(),
      },
      create: {
        email,
        name: parsedEmail.name,
        lastLogin: new Date(),
      },
      select: defaultUserSelect,
    })

    await tx.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: AccountProvider.Email,
          providerAccountId: parsedEmail.address,
        },
      },
      update: {},
      create: {
        provider: AccountProvider.Email,
        providerAccountId: parsedEmail.address,
        userId: user.id,
      },
    })
    // isNewUser is read at READ COMMITTED, so two concurrent first-ever logins
    // for the same email can both see "no user" and each emit accountCreated
    // once. Unreachable in the OTP flow (needs two valid OTPs submitted in the
    // same instant) and a duplicate audit line dedupes at the sink. If a flow
    // makes this reachable, take a pg advisory lock or use SERIALIZABLE + retry.
    return { user, isNewUser: !existing }
  })

  // A first email login is a self-signup: the acting user is the account just
  // created, so bind user_id before emitting to attribute the actor (== target).
  if (isNewUser) {
    logger
      ?.withBindings({ userId: user.id })
      .audit.userManagement.accountCreated({ targetUserId: user.id })
  }

  return user
}

/**
 * Logs a user in from a verified Okta OIDC identity. Mirrors
 * {@link loginUserByEmail}: upserts the `User` keyed by email and links an
 * `Account` row keyed by the Okta `sub` (stable per-user identifier), so the
 * same person logging in via email OTP and via Okta resolves to one user.
 */
export const loginUserByOkta = async ({
  sub,
  email,
  name,
}: {
  sub: string
  email: string
  name?: string | null
}) => {
  return await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        lastLogin: new Date(),
      },
      create: {
        email,
        name: name ?? null,
        lastLogin: new Date(),
      },
      select: defaultUserSelect,
    })

    await tx.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: AccountProvider.Okta,
          providerAccountId: sub,
        },
      },
      update: {},
      create: {
        provider: AccountProvider.Okta,
        providerAccountId: sub,
        userId: user.id,
      },
    })
    return user
  })
}

/**
 * Logs a user in from a verified Google OIDC identity. Mirrors
 * {@link loginUserByOkta}: upserts the `User` keyed by email and links an
 * `Account` row keyed by the Google `sub`, so the same person logging in via
 * email OTP, Okta, and Google all resolve to one user.
 */
export const loginUserByGoogle = async ({
  sub,
  email,
  name,
}: {
  sub: string
  email: string
  name?: string | null
}) => {
  return await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        lastLogin: new Date(),
      },
      create: {
        email,
        name: name ?? null,
        lastLogin: new Date(),
      },
      select: defaultUserSelect,
    })

    await tx.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: AccountProvider.Google,
          providerAccountId: sub,
        },
      },
      update: {},
      create: {
        provider: AccountProvider.Google,
        providerAccountId: sub,
        userId: user.id,
      },
    })
    return user
  })
}

export const getUserById = async (userId: string) => {
  return await db.user.findUnique({
    where: { id: userId },
    select: defaultUserSelect,
  })
}
