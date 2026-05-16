import express from 'express';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import { db } from './db/index.js';
import { users, accounts } from './db/schema.js';

export const apiRouter = express.Router();

let migrationPromise: Promise<void> | null = null;

apiRouter.use(async (req, res, next) => {
  if (!migrationPromise) {
    migrationPromise = migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') })
      .then(() => console.log('Database migrated successfully!'))
      .catch(err => {
        console.error('Migration failed:', err);
        migrationPromise = null; // retry next time
      });
  }
  await migrationPromise;
  next();
});

apiRouter.use(express.json());

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-123456');

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', using: 'supabase-postgres' });
});

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) return res.status(400).json({ error: 'Email in use' });

    const hash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({
      email,
      passwordHash: hash
    }).returning();

    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { name, avatarUrl } = req.body;
    const [user] = await db.update(users)
      .set({ name, avatarUrl })
      .where(eq(users.id, payload.id as string))
      .returning();

    res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/auth/guest', async (req, res) => {
  try {
    const guestEmail = `guest_${crypto.randomUUID()}@guest.local`;
    const [user] = await db.insert(users).values({
      email: guestEmail,
      name: 'Guest User',
    }).returning();

    const token = await new jose.SignJWT({ id: user.id, email: user.email, isGuest: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email, name: user.name, isGuest: true }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, payload.id as string) });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, isGuest: !!payload.isGuest });
  } catch (e: any) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

const getBaseUrl = (req: express.Request) => {
  let host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  let protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  if (String(host).includes('vercel.app')) {
    protocol = 'https';
  }
  return `${protocol}://${host}`;
};

apiRouter.get('/auth/github/url', (req, res) => {
  try {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(501).json({ error: 'GitHub OAuth is not configured. Missing GITHUB_CLIENT_ID.' });
    }
    const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('No code provided');

  try {
    // 1. Get access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    // 2. Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });
    const userData = await userResponse.json();

    let email = userData.email;
    // 3. GitHub users might have hidden emails
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });
      const emailsData = await emailsResponse.json();
      const primaryEmail = emailsData.find((e: any) => e.primary && e.verified);
      email = primaryEmail ? primaryEmail.email : emailsData[0]?.email;
    }
    
    if (!email) throw new Error('No email found from GitHub');

    // 4. Upsert user entirely using drizzle
    // Check if user exists via email or accounts table
    let user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user) {
      [user] = await db.insert(users).values({
        email: email,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
      }).returning();
    }

    // Check account mapping
    const existingAccount = await db.query.accounts.findFirst({
      where: (accounts, { eq, and }) =>
        and(eq(accounts.provider, 'github'), eq(accounts.providerAccountId, String(userData.id)))
    });

    if (!existingAccount) {
      await db.insert(accounts).values({
        userId: user.id,
        provider: 'github',
        providerAccountId: String(userData.id),
        accessToken: tokenData.access_token,
      });
    }

    // Generate JWT
    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?token=${token}';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (e: any) {
    console.error('GitHub oauth error:', e);
    const errMessage = e.cause ? e.cause.message : e.message;
    const err = encodeURIComponent(errMessage);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
});

apiRouter.get('/auth/google/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.' });
  }
  const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile`;
  res.json({ url });
});

apiRouter.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('No code provided');

  try {
    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    // 1. Get tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    // 2. Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();
    
    if (!userData.email) throw new Error('No email found from Google');

    // 3. Upsert user
    let user = await db.query.users.findFirst({ where: eq(users.email, userData.email) });
    if (!user) {
      [user] = await db.insert(users).values({
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture,
      }).returning();
    }

    // Check account mapping
    const existingAccount = await db.query.accounts.findFirst({
      where: (accounts, { eq, and }) =>
        and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, String(userData.id)))
    });

    if (!existingAccount) {
      await db.insert(accounts).values({
        userId: user.id,
        provider: 'google',
        providerAccountId: String(userData.id),
        accessToken: tokenData.access_token,
      });
    }

    // Generate JWT
    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?token=${token}';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (e: any) {
    console.error('Google oauth error:', e);
    const errMessage = e.cause ? e.cause.message : e.message;
    const err = encodeURIComponent(errMessage);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
});
