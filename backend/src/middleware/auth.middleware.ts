import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { eq } from 'drizzle-orm'

import { db } from '../db/drizzle.ts'
import { userTable } from '../drizzle/schema.ts'
import { logger } from '../logger.ts'
import cfg from '../utils/cfg.ts'

const client = jwksClient({
  jwksUri: `${cfg.sts.issuer_uri}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 600_000,
})

export interface AuthInfo {
  userId: string
  email: string
  displayName: string
  role: 'admin' | 'moderator' | 'analyst'
}

interface KeycloakToken extends JwtPayload {
  sub: string
  email?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  name?: string
}

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err)
      resolve(key!.getPublicKey())
    })
  })
}

async function verifyToken(token: string): Promise<KeycloakToken> {
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded?.header.kid) {
    throw new Error('Token missing kid header')
  }

  const publicKey = await getSigningKey(decoded.header.kid)
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: cfg.sts.issuer_uri,
  }) as KeycloakToken
}

async function upsertUser(
  claims: KeycloakToken,
): Promise<{
  id: string
  displayName: string
  email: string
  role: 'admin' | 'moderator' | 'analyst'
}> {
  const displayName =
    claims.name ??
    [claims.given_name, claims.family_name].filter(Boolean).join(' ') ??
    claims.preferred_username ??
    'Unknown'
  const email = claims.email ?? ''

  const existing = await db.query.userTable.findFirst({
    where: eq(userTable.id, claims.sub),
  })

  if (existing) {
    if (existing.displayName !== displayName || existing.email !== email) {
      await db
        .update(userTable)
        .set({ displayName, email })
        .where(eq(userTable.id, claims.sub))
    }
    return {
      id: existing.id,
      displayName,
      email,
      role: existing.role,
    }
  }

  const defaultRole = cfg.accessControl.defaultRole
  await db.insert(userTable).values({
    id: claims.sub,
    displayName,
    email,
    role: defaultRole,
  })

  return { id: claims.sub, displayName, email, role: defaultRole }
}

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    // No token — pass through; tRPC procedures enforce auth at the procedure level
    next()
    return
  }

  const token = authHeader.slice(7)

  try {
    const decoded = await verifyToken(token)
    const user = await upsertUser(decoded)

    const role = cfg.accessControl.admins.includes(user.email)
      ? 'admin'
      : user.role

    ;(req as Request & { authInfo: AuthInfo }).authInfo = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      role,
    } satisfies AuthInfo

    next()
  } catch (err) {
    logger.warn('Auth failed', { error: (err as Error).message })
    next()
  }
}
