import { beforeEach, describe, expect, it } from 'vitest'
import { resetTables } from '~tests/db/utils'

import { db } from '@acme/db'

import { AccountProvider } from '../../auth/auth.constants'
import {
  getUserById,
  loginUserByEmail,
  loginUserByGoogle,
  loginUserByOkta,
} from '../user.service'

describe('user.service', () => {
  beforeEach(async () => {
    await resetTables(['VerificationToken', 'User', 'Account'])
  })

  describe('loginUserByEmail', () => {
    it('should create a new user and account for a new email', async () => {
      const email = 'newuser@example.com'

      const user = await loginUserByEmail(email)

      expect(user).toBeDefined()
      expect(user.email).toBe(email)
      expect(user.id).toBeTruthy()

      // Verify user was created in database
      const dbUser = await db.user.findUnique({
        where: { email },
      })
      expect(dbUser).toBeDefined()
      expect(dbUser?.email).toBe(email)

      // Verify account was created
      const account = await db.account.findFirst({
        where: {
          userId: user.id,
          provider: AccountProvider.Email,
        },
      })
      expect(account).toBeDefined()
      expect(account?.providerAccountId).toBe(email)
    })

    it('should parse and store the name from email address', async () => {
      const email = 'john.doe@example.com'

      const user = await loginUserByEmail(email)

      expect(user.email).toBe(email)
      // When there's no name in the email format, name should be null or undefined
      expect(user.name).toBeNull()
    })

    it('should return existing user when upserting with same email', async () => {
      const email = 'existing@example.com'

      // First upsert
      const user1 = await loginUserByEmail(email)

      // Second upsert with same email
      const user2 = await loginUserByEmail(email)

      // Should be the same user
      expect(user1.id).toBe(user2.id)
      expect(user1.email).toBe(user2.email)

      // Should only have one user in database
      const users = await db.user.findMany({
        where: { email },
      })
      expect(users).toHaveLength(1)
    })

    it('should return existing account when upserting with same email', async () => {
      const email = 'existing@example.com'

      // First upsert
      const user1 = await loginUserByEmail(email)

      // Second upsert with same email
      await loginUserByEmail(email)

      // Should only have one account in database
      const accounts = await db.account.findMany({
        where: {
          userId: user1.id,
          provider: AccountProvider.Email,
        },
      })
      expect(accounts).toHaveLength(1)
    })

    it('should throw error for invalid email address', async () => {
      const invalidEmail = 'not-an-email'

      await expect(loginUserByEmail(invalidEmail)).rejects.toThrow(
        'Invalid email address'
      )
    })

    it('should throw error for group email addresses', async () => {
      const groupEmail = 'Group Name: user1@example.com, user2@example.com;'

      await expect(loginUserByEmail(groupEmail)).rejects.toThrow(
        'Invalid email address'
      )
    })

    it('should handle email addresses without names', async () => {
      const email = 'simple@example.com'

      const user = await loginUserByEmail(email)

      expect(user.email).toBe(email)
      expect(user.name).toBeNull()
    })

    it('should handle email addresses with special characters', async () => {
      const email = 'user+tag@example.com'

      const user = await loginUserByEmail(email)

      expect(user.email).toBe(email)
      expect(user.id).toBeTruthy()

      const account = await db.account.findFirst({
        where: {
          userId: user.id,
          provider: AccountProvider.Email,
        },
      })
      expect(account?.providerAccountId).toBe(email)
    })

    it('should create user and account in a transaction', async () => {
      const email = 'transaction@example.com'

      const user = await loginUserByEmail(email)

      // Both user and account should exist
      const dbUser = await db.user.findUnique({
        where: { email },
      })
      const account = await db.account.findFirst({
        where: {
          userId: user.id,
          provider: AccountProvider.Email,
        },
      })

      expect(dbUser).toBeDefined()
      expect(account).toBeDefined()
      expect(account?.userId).toBe(user.id)
    })

    it('should handle multiple different users', async () => {
      const emails = [
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ]

      const users = await Promise.all(
        emails.map((email) => loginUserByEmail(email))
      )

      // All users should have unique IDs
      const userIds = users.map((u) => u.id)
      const uniqueIds = new Set(userIds)
      expect(uniqueIds.size).toBe(emails.length)

      // All users should have correct emails
      users.forEach((user, index) => {
        expect(user.email).toBe(emails[index])
      })

      // Each user should have one account
      for (const user of users) {
        const accounts = await db.account.findMany({
          where: {
            userId: user.id,
            provider: AccountProvider.Email,
          },
        })
        expect(accounts).toHaveLength(1)
      }
    })

    it('should preserve user data on subsequent upserts', async () => {
      const email = 'preserve@example.com'

      // First upsert
      const user1 = await loginUserByEmail(email)

      // Manually update user data
      await db.user.update({
        where: { id: user1.id },
        data: { image: 'https://example.com/avatar.jpg' },
      })

      // Second upsert
      const user2 = await loginUserByEmail(email)

      // Data should be preserved
      expect(user2.id).toBe(user1.id)
      expect(user2.image).toBe('https://example.com/avatar.jpg')
    })

    it('should use Email provider constant for account creation', async () => {
      const email = 'provider@example.com'

      const user = await loginUserByEmail(email)

      const account = await db.account.findFirst({
        where: {
          userId: user.id,
        },
      })

      expect(account?.provider).toBe(AccountProvider.Email)
      expect(account?.provider).toBe('email')
    })
  })

  describe('loginUserByOkta', () => {
    it('should create a user and an Okta account for a new identity', async () => {
      const sub = 'okta-sub-001'
      const email = 'okta.newuser@example.com'

      const user = await loginUserByOkta({ sub, email, name: 'Okta User' })

      expect(user.email).toBe(email)
      expect(user.name).toBe('Okta User')

      const account = await db.account.findFirst({
        where: { userId: user.id, provider: AccountProvider.Okta },
      })
      expect(account?.provider).toBe('okta')
      expect(account?.providerAccountId).toBe(sub)
    })

    it('should be idempotent for the same Okta sub', async () => {
      const sub = 'okta-sub-002'
      const email = 'okta.repeat@example.com'

      const user1 = await loginUserByOkta({ sub, email })
      const user2 = await loginUserByOkta({ sub, email })

      expect(user1.id).toBe(user2.id)

      const accounts = await db.account.findMany({
        where: { userId: user1.id, provider: AccountProvider.Okta },
      })
      expect(accounts).toHaveLength(1)
    })

    it('should link an Okta login to the existing user with the same email', async () => {
      const email = 'shared@example.com'

      const emailUser = await loginUserByEmail(email)
      const oktaUser = await loginUserByOkta({ sub: 'okta-sub-003', email })

      // Same person — one User, two provider Accounts.
      expect(oktaUser.id).toBe(emailUser.id)

      const accounts = await db.account.findMany({
        where: { userId: emailUser.id },
        orderBy: { provider: 'asc' },
      })
      expect(accounts.map((a) => a.provider)).toStrictEqual(['email', 'okta'])

      const users = await db.user.findMany({ where: { email } })
      expect(users).toHaveLength(1)
    })

    it('should update lastLogin on repeat sign-in', async () => {
      const sub = 'okta-sub-004'
      const email = 'okta.lastlogin@example.com'

      await loginUserByOkta({ sub, email })
      const first = await db.user.findUniqueOrThrow({ where: { email } })

      await loginUserByOkta({ sub, email })
      const second = await db.user.findUniqueOrThrow({ where: { email } })

      expect(second.lastLogin?.getTime()).toBeGreaterThanOrEqual(
        first.lastLogin?.getTime() ?? 0
      )
    })
  })

  describe('loginUserByGoogle', () => {
    it('should create a user and a Google account for a new identity', async () => {
      const sub = 'google-sub-001'
      const email = 'google.newuser@example.com'

      const user = await loginUserByGoogle({ sub, email, name: 'Google User' })

      expect(user.email).toBe(email)
      expect(user.name).toBe('Google User')

      const account = await db.account.findFirst({
        where: { userId: user.id, provider: AccountProvider.Google },
      })
      expect(account?.provider).toBe('google')
      expect(account?.providerAccountId).toBe(sub)
    })

    it('should be idempotent for the same Google sub', async () => {
      const sub = 'google-sub-002'
      const email = 'google.repeat@example.com'

      const user1 = await loginUserByGoogle({ sub, email })
      const user2 = await loginUserByGoogle({ sub, email })

      expect(user1.id).toBe(user2.id)

      const accounts = await db.account.findMany({
        where: { userId: user1.id, provider: AccountProvider.Google },
      })
      expect(accounts).toHaveLength(1)
    })

    it('should link Google, Okta, and email logins to one user by email', async () => {
      const email = 'multi@example.com'

      const emailUser = await loginUserByEmail(email)
      await loginUserByOkta({ sub: 'okta-multi', email })
      const googleUser = await loginUserByGoogle({ sub: 'google-multi', email })

      // Same person — one User, three provider Accounts.
      expect(googleUser.id).toBe(emailUser.id)

      const accounts = await db.account.findMany({
        where: { userId: emailUser.id },
        orderBy: { provider: 'asc' },
      })
      expect(accounts.map((a) => a.provider)).toStrictEqual([
        'email',
        'google',
        'okta',
      ])

      const users = await db.user.findMany({ where: { email } })
      expect(users).toHaveLength(1)
    })
  })

  describe('getUserById', () => {
    it('should return user when user exists', async () => {
      const email = 'getuser@example.com'
      const createdUser = await db.user.create({
        data: { email, name: 'Test user' },
      })

      const user = await getUserById(createdUser.id)

      expect(user).toStrictEqual({
        id: createdUser.id,
        email,
        image: null,
        name: 'Test user',
      })
    })

    it('should return null when user does not exist', async () => {
      const nonExistentId = 'non-existent-user-id'

      const user = await getUserById(nonExistentId)

      expect(user).toBeNull()
    })
  })
})
