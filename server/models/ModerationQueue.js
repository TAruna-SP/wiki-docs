import mongoose from 'mongoose';
import { MODERATION_TYPE, MODERATION_STATUS } from '../config/constants.js';

const moderationItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.values(MODERATION_TYPE), required: true, index: true },
    status: { type: String, enum: Object.values(MODERATION_STATUS), default: MODERATION_STATUS.PENDING, index: true },

    query_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Query', default: null },
    answer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', default: null },
    duplicate_of_query_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Query', default: null },
    similarity_score: { type: Number, default: null },

    reason: { type: String, default: null },
    raised_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Resolution metadata.
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },
    resolution_note: { type: String, default: null },
  },
  { timestamps: true },
);

export const ModerationQueue = mongoose.model('ModerationQueue', moderationItemSchema);
export default ModerationQueue;
