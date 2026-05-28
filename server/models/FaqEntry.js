import mongoose from 'mongoose';
import { FAQ_SOURCE, EMBEDDING_DIMS } from '../config/constants.js';

const faqEntrySchema = new mongoose.Schema(
  {
    category: { type: String, required: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    sort_order: { type: Number, default: 0 },

    source: { type: String, enum: Object.values(FAQ_SOURCE), default: FAQ_SOURCE.ADMIN },
    source_query_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Query', default: null },

    // LRU.
    last_accessed_at: { type: Date, default: Date.now },
    access_count: { type: Number, default: 0 },

    is_outdated: { type: Boolean, default: false },

    embedding: { type: [Number], default: undefined, validate: (v) => !v || v.length === EMBEDDING_DIMS },

    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true },
);

faqEntrySchema.index({ question: 'text', answer: 'text' });

export const FaqEntry = mongoose.model('FaqEntry', faqEntrySchema);
export default FaqEntry;
