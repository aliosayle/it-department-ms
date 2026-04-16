import jwt from 'jsonwebtoken'
import { config } from './config.js'

export type JwtPayload = { sub: string; login: string; typ: 'access' | 'refresh' }

export function signAccess(payload: { sub: string; login: string }): string {
  return jwt.sign({ ...payload, typ: 'access' }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpires,
  } as jwt.SignOptions)
}

export function signRefresh(payload: { sub: string; login: string }): string {
  return jwt.sign({ ...payload, typ: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpires,
  } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload {
  const d = jwt.verify(token, config.jwt.secret) as JwtPayload
  return d
}
