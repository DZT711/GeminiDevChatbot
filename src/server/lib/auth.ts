import { db } from '../db/index';
import { users, accounts } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Upsert user + account rows after a successful OAuth callback.
 * Handles both first-time registration and returning login in one query.
 */
export async function upsertUser({
  provider,
  providerAccountId,
  email,
  name,
  avatarUrl,
  accessToken,
  refreshToken,
}: {
  provider: string;
  providerAccountId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
}) {
  // 1. Upsert users table
  const [user] = await db.insert(users)
    .values({
      email,
      name,
      avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { name, avatarUrl }
    })
    .returning();

  // 2. Upsert accounts table
  const existingAccount = await db.query.accounts.findFirst({
    where: and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId))
  });
  
  if (existingAccount) {
    await db.update(accounts)
      .set({ accessToken, refreshToken })
      .where(eq(accounts.id, existingAccount.id));
  } else {
    await db.insert(accounts).values({
      userId: user.id,
      provider,
      providerAccountId,
      accessToken,
      refreshToken,
    });
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}
