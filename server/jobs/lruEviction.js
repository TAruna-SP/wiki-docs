import { Query } from '../models/Query.js';
import { QUERY_STATUS, LRU_ARCHIVE_DAYS } from '../config/constants.js';

/**
 * LRU eviction (Milestone 7). Archives resolved queries that haven't been
 * accessed in LRU_ARCHIVE_DAYS so the active list stays fresh. Archived queries
 * are auto-unarchived when next viewed (queryService.getQuery).
 * @returns {Promise<{ archived: number }>}
 */
export async function lruEviction() {
  const cutoff = new Date(Date.now() - LRU_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
  const res = await Query.updateMany(
    {
      is_deleted: false,
      is_archived: false,
      status: QUERY_STATUS.RESOLVED,
      last_accessed_at: { $lte: cutoff },
    },
    { $set: { is_archived: true } },
  );
  return { archived: res.modifiedCount ?? 0 };
}

export default lruEviction;
