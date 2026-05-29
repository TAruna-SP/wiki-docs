import { Like } from '../models/Like.js';
import { Answer } from '../models/Answer.js';
import { User } from '../models/User.js';
import { ChatbotSession } from '../models/ChatbotSession.js';

/**
 * Orphan cleanup (Milestone 7). Removes likes pointing at answers that no longer
 * exist (or were soft-deleted) and chatbot sessions owned by deleted users.
 * @returns {Promise<{ likes_removed: number, sessions_removed: number }>}
 */
export async function orphanCleanup() {
  const liveAnswerIds = await Answer.find({ is_deleted: false }).distinct('_id');
  const likeRes = await Like.deleteMany({ answer_id: { $nin: liveAnswerIds } });

  const deletedUserIds = await User.find({ is_deleted: true }).distinct('_id');
  const sessionRes = deletedUserIds.length
    ? await ChatbotSession.deleteMany({ user_id: { $in: deletedUserIds } })
    : { deletedCount: 0 };

  return {
    likes_removed: likeRes.deletedCount ?? 0,
    sessions_removed: sessionRes.deletedCount ?? 0,
  };
}

export default orphanCleanup;
