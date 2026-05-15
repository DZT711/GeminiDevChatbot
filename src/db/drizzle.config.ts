import { defineConfig } from 'drizzle-kit';

function getSafeDbUrl(url: string | undefined): string {
  if (!url) return 'postgresql://user:password@localhost:5432/db';
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
  
  // Try to decode to see if it's already encoded; if it throws or is not, encode it
  try {
    if (decodeURIComponent(pass) === pass) {
        pass = encodeURIComponent(pass);
    }
  } catch (e) {
      pass = encodeURIComponent(pass);
  }
  
  return `${prefix}${user}:${pass}${hostPortDb}`;
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: getSafeDbUrl(process.env.DATABASE_URL),
  },
});
