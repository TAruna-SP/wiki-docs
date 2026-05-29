import { Query } from '../models/Query.js';
import { Answer } from '../models/Answer.js';
import { FaqEntry } from '../models/FaqEntry.js';
import { AuditLog } from '../models/AuditLog.js';
import { SOFT_DELETE_PURGE_DAYS } from '../config/constants.js';

const TARGETS = [
  ['query', Query],
  ['answer', Answer],
  ['faq_entry', FaqEntry],
];

/**
 * Soft-delete purge (Milestone 7). Permanently removes content soft-deleted more
 * than SOFT_DELETE_PURGE_DAYS ago, writing an audit record of each batch first
 * (deletion-with-audit, PLANNING §10/§12).
 * @returns {Promise<Record<string, number>>} purged counts per entity type
 */
export async function softDeletePurge() {
  const cutoff = new Date(Date.now() - SOFT_DELETE_PURGE_DAYS * 24 * 60 * 60 * 1000);
  const result = {};

  for (const [entity, Model] of TARGETS) {
    const docs = await Model.find({ is_deleted: true, deleted_at: { $lte: cutoff } }).select('_id');
    const ids = docs.map((d) => d._id);
    if (ids.length) {
      await AuditLog.create({
        action: `${entity}.purge`,
        entity_type: entity,
        details: { count: ids.length, ids: ids.map(String) },
      });
      await Model.deleteMany({ _id: { $in: ids } });
    }
    result[entity] = ids.length;
  }
  return result;
}

export default softDeletePurge;
