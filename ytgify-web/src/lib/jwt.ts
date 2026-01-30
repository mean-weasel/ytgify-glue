import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
)

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

export interface TokenPayload extends JWTPayload {
  sub: string // user id
  email: string
  type: 'access' | 'refresh'
}

export async function createAccessToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email, type: 'access' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function createRefreshToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email, type: 'refresh' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function createTokenPair(userId: string, email: string) {
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(userId, email),
    createRefreshToken(userId, email),
  ])
  return { accessToken, refreshToken }
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as TokenPayload
  } catch {
    return null
  }
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  const payload = await verifyToken(token)
  if (!payload || payload.type !== 'access') {
    return null
  }
  return payload
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  const payload = await verifyToken(token)
  if (!payload || payload.type !== 'refresh') {
    return null
  }
  return payload
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}
