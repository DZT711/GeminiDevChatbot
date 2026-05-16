import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
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

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
const isLocal = !dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: getSafeDbUrl(dbUrl),
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
