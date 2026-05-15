import { SignJWT, jwtVerify } from 'jose'

function getSecret() {
  const raw = process.env.JWT_SECRET || 'fallback-secret-for-development-do-not-use-in-prod'
  return new TextEncoder().encode(raw)
}

/**
 * Sign a JWT that expires in 7 days.
 * @param payload 
 * @returns signed JWT string
 */
export async function createSession(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

/**
 * Verify a JWT and return its payload, or null if invalid/expired.
 * @param token 
 * @returns 
 */
export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload
  } catch {
    return null
  }
}
