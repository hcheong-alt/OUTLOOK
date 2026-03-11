import type { Request } from 'express'
import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

import cfg from '../utils/cfg.ts'
import { logger } from '../logger.ts'

const client = jwksClient({
  jwksUri: `${cfg.sts.issuer_uri}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxAge: 600_000,
})

export interface PublicApiAuth {
  type: 'user' | 'service'
  userId?: string
  role?: string
}

interface KeycloakToken extends JwtPayload {
  sub: string
  email?: string
  preferred_username?: string
  azp?: string
  realm_access?: { roles?: string[] }
}

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err)
      resolve(key!.getPublicKey())
    })
  })
}

/**
 * Validate a Bearer token from a public API request.
 * Supports both user tokens (with sub claim) and service account tokens
 * (client_credentials grant with azp but no sub).
 */
export async function validatePublicApiToken(
  req: Request,
): Promise<PublicApiAuth | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded?.header.kid) {
      logger.warn('Public API token missing kid header')
      return null
    }

    const publicKey = await getSigningKey(decoded.header.kid)
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: cfg.sts.issuer_uri,
    }) as KeycloakToken

    // Service account token (client_credentials grant)
    if (!verified.sub && verified.azp) {
      return {
        type: 'service',
      }
    }

    // User token
    if (verified.sub) {
      const isAdmin = cfg.accessControl.admins.includes(
        verified.email ?? '',
      )
      const realmRoles = verified.realm_access?.roles ?? []
      const role = isAdmin
        ? 'admin'
        : realmRoles.includes('moderator')
          ? 'moderator'
          : 'analyst'

      return {
        type: 'user',
        userId: verified.sub,
        role,
      }
    }

    logger.warn('Public API token has neither sub nor azp')
    return null
  } catch (err) {
    logger.warn('Public API token validation failed', {
      error: (err as Error).message,
    })
    return null
  }
}
