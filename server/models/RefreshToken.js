import mongoose from 'mongoose';

// Stores only the SHA-256 hash of a refresh token so logout can revoke it and
// a DB leak cannot be replayed.
const refreshTokenSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    user_agent: { type: String, default: null },
  },
  { timestamps: true },
);

// TTL index: Mongo removes expired token docs automatically.
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
