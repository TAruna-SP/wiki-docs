import mongoose from 'mongoose';
import { ROLES } from '../config/constants.js';

const negativeBadgeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // warning | restricted | suspended
    label: String,
    icon: String,
    reason: String,
    issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issued_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },

    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] }, // positive badge keys
    negative_badges: { type: [negativeBadgeSchema], default: [] },

    spam_flag_count: { type: Number, default: 0 },
    is_banned: { type: Boolean, default: false },
    ban_expires_at: { type: Date, default: null }, // null = permanent when is_banned
    ban_reason: { type: String, default: null },
    requires_approval: { type: Boolean, default: false }, // 🚫 restricted

    login_streak: { type: Number, default: 0 },
    last_login_at: { type: Date, default: null },

    notification_prefs: {
      type: Object,
      default: () => ({ answers: true, mentions: true, system: true }),
    },

    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true },
);

// Hide sensitive fields when serialized.
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password_hash;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
export default User;
