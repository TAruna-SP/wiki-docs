import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
  {
    answer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One like per user per answer.
likeSchema.index({ answer_id: 1, user_id: 1 }, { unique: true });

export const Like = mongoose.model('Like', likeSchema);
export default Like;
