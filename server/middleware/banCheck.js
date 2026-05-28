import { ApiError } from '../utils/ApiError.js';

// Blocks write actions for currently-banned users. Expired bans are lifted
// lazily here (in addition to the hourly cron) so the gate is always correct.
// Use after auth on routes that create/modify content.
export async function banCheck(req, _res, next) {
  const user = req.user;
  if (!user?.is_banned) return next();

  const expires = user.ban_expires_at;
  if (expires && expires.getTime() <= Date.now()) {
    user.is_banned = false;
    user.ban_expires_at = null;
    user.ban_reason = null;
    await user.save();
    return next();
  }

  const when = expires ? `until ${expires.toISOString()}` : 'permanently';
  return next(ApiError.forbidden(`Account is banned ${when}. ${user.ban_reason ?? ''}`.trim()));
}
