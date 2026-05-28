import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshTtl });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

// We store only a hash of refresh tokens, so a DB leak can't be replayed and
// logout can truly revoke a session.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
