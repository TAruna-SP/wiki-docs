import { Answer } from '../models/Answer.js';
import { STALENESS_DAYS } from '../config/constants.js';

/**
 * Staleness check (Milestone 7). Flags answers older than STALENESS_DAYS as
 * outdated so moderators / the UI can prompt a review.
 * @returns {Promise<{ flagged: number }>}
 */
export async function stalenessCheck() {
  const cutoff = new Date(Date.now() - STALENESS_DAYS * 24 * 60 * 60 * 1000);
  const res = await Answer.updateMany(
    { is_deleted: false, is_outdated: false, createdAt: { $lte: cutoff } },
    { $set: { is_outdated: true } },
  );
  return { flagged: res.modifiedCount ?? 0 };
}

export default stalenessCheck;
