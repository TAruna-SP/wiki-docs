import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../utils/jwt.js';
import { config } from '../config/env.js';
import crypto from 'node:crypto';

// Parse a TTL string like '7d' / '15m' to milliseconds (for token expiry rows).
function ttlToMs(ttl) {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  return n * { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2]];
}

function issueAccess(user) {
  return signAccessToken({ sub: String(user._id), role: user.role });
}

async function issueRefresh(user, userAgent) {
  // jti makes every refresh token unique even when two are issued in the same
  // second for the same user (otherwise identical JWTs collide on token_hash).
  const token = signRefreshToken({ sub: String(user._id), jti: crypto.randomUUID() });
  await RefreshToken.create({
    user_id: user._id,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + ttlToMs(config.jwt.refreshTtl)),
    user_agent: userAgent ?? null,
  });
  return token;
}

export async function register({ name, email, password }, userAgent) {
  if (!name || !email || !password) throw ApiError.badRequest('name, email and password are required');
  if (password.length < 8) throw ApiError.badRequest('Password must be at least 8 characters');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('Email already registered');

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password_hash: await hashPassword(password),
    last_login_at: new Date(),
    login_streak: 1,
  });

  return {
    user: user.toJSON(),
    accessToken: issueAccess(user),
    refreshToken: await issueRefresh(user, userAgent),
  };
}

export async function login({ email, password }, userAgent) {
  if (!email || !password) throw ApiError.badRequest('email and password are required');

  const user = await User.findOne({ email: email.toLowerCase(), is_deleted: false }).select('+password_hash');
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Update login streak (consecutive calendar days).
  const now = new Date();
  const last = user.last_login_at;
  if (last) {
    const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(last).setHours(0, 0, 0, 0)) / 864e5);
    if (days === 1) user.login_streak += 1;
    else if (days > 1) user.login_streak = 1;
  } else {
    user.login_streak = 1;
  }
  user.last_login_at = new Date();
  await user.save();

  return {
    user: user.toJSON(),
    accessToken: issueAccess(user),
    refreshToken: await issueRefresh(user, userAgent),
  };
}

// Rotate refresh token: validate, revoke the old, issue a new pair.
export async function refresh(token, userAgent) {
  if (!token) throw ApiError.unauthorized('Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await RefreshToken.findOne({ token_hash: hashToken(token) });
  if (!stored || stored.revoked) throw ApiError.unauthorized('Refresh token revoked');

  const user = await User.findById(payload.sub);
  if (!user || user.is_deleted) throw ApiError.unauthorized('User no longer exists');

  stored.revoked = true;
  await stored.save();

  return {
    accessToken: issueAccess(user),
    refreshToken: await issueRefresh(user, userAgent),
  };
}

export async function logout(token) {
  if (!token) return;
  await RefreshToken.updateOne({ token_hash: hashToken(token) }, { revoked: true });
}
