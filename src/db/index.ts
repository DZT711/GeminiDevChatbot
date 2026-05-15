import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';
dotenv.config();

function getSafeDbUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const prefix = 'postgresql://';
  if (!url.startsWith(prefix)) return url;
  
  const withoutPrefix = url.slice(prefix.length);
  const lastAt = withoutPrefix.lastIndexOf('@');
  if (lastAt === -1) return url;
  
  const userPass = withoutPrefix.slice(0, lastAt);
  const hostPortDb = withoutPrefix.slice(lastAt);
  
  const colonIdx = userPass.indexOf(':');
  if (colonIdx === -1) return url;
  
  const user = userPass.slice(0, colonIdx);
  let pass = userPass.slice(colonIdx + 1);
  
  try {
    if (decodeURIComponent(pass) === pass) {
        pass = encodeURIComponent(pass);
    }
  } catch (e) {
      pass = encodeURIComponent(pass);
  }
  
  return `${prefix}${user}:${pass}${hostPortDb}`;
}

const { Pool } = pkg;

const pool = new Pool({
  connectionString: getSafeDbUrl(process.env.DATABASE_URL),
});

export const db = drizzle(pool, { schema });
