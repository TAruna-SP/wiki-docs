import mongoose from 'mongoose';

// Append-only record of consequential actions (who / what / when + a snapshot).
const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true }, // e.g. 'query.soft_delete'
    entity_type: { type: String, required: true }, // 'query' | 'answer' | 'user' | ...
    entity_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    details: { type: Object, default: {} }, // data snapshot
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
