import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';

// Require a valid access token; attaches req.user (lean document).
export async function auth(req, _res, next) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized('Missing access token');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token');
    }

    const user = await User.findById(payload.sub);
    if (!user || user.is_deleted) throw ApiError.unauthorized('User no longer exists');

    req.user = user;
    req.userId = String(user._id);
    next();
  } catch (err) {
    next(err);
  }
}

// Optional auth: attaches req.user when a valid token is present, else continues.
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findById(payload.sub);
    if (user && !user.is_deleted) {
      req.user = user;
      req.userId = String(user._id);
    }
  } catch {
    // ignore — treat as anonymous
  }
  next();
}

// Require admin role (use after auth).
export function admin(req, _res, next) {
  if (req.user?.role !== ROLES.ADMIN) return next(ApiError.forbidden('Admin only'));
  next();
}
