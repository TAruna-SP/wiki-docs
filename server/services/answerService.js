import { Answer } from '../models/Answer.js';
import { Query } from '../models/Query.js';
import { Like } from '../models/Like.js';
import { User } from '../models/User.js';
import { ModerationQueue } from '../models/ModerationQueue.js';
import { ApiError } from '../utils/ApiError.js';
import { notify } from './notificationService.js';
import {
  POINTS,
  QUERY_STATUS,
  NOTIFICATION_TYPE,
  MODERATION_TYPE,
  ROLES,
} from '../config/constants.js';

function serializeAnswer(obj, viewerId) {
  const plain = typeof obj.toObject === 'function' ? obj.toObject() : obj;
  const authorRef = plain.author_id;
  const authorId = authorRef?._id ?? authorRef;
  const isOwner = Boolean(viewerId && authorId && String(authorId) === String(viewerId));
  // eslint-disable-next-line no-unused-vars
  const { author_id, __v, ...rest } = plain;
  return {
    ...rest,
    id: plain._id,
    author: { id: authorId ?? null, name: authorRef?.name ?? null },
    is_owner: isOwner,
  };
}

/** Post an answer; flips an open query to "answered" and starts the Path B clock. */
export async function postAnswer(user, queryId, body) {
  const text = String(body ?? '').trim();
  if (!text) throw ApiError.badRequest('Answer body is required');

  const query = await Query.findOne({ _id: queryId, is_deleted: false });
  if (!query) throw ApiError.notFound('Query not found');
  if (query.status === QUERY_STATUS.RESOLVED) {
    throw ApiError.badRequest('This question is already resolved');
  }

  const answer = await Answer.create({ query_id: query._id, author_id: user._id, body: text });

  if (!query.first_answered_at) {
    query.first_answered_at = new Date();
    if (query.status === QUERY_STATUS.OPEN) query.status = QUERY_STATUS.ANSWERED;
    await query.save();
  }

  if (String(query.author_id) !== String(user._id)) {
    await notify({
      recipientId: query.author_id,
      type: NOTIFICATION_TYPE.ANSWER,
      title: 'New answer to your question',
      message: query.title,
      link: `/queries/${query._id}`,
      queryId: query._id,
      answerId: answer._id,
    });
  }

  await answer.populate('author_id', 'name');
  return serializeAnswer(answer, user._id);
}

/** List a query's answers (accepted first, then by likes), with the viewer's like state. */
export async function listAnswers(queryId, viewerId) {
  const answers = await Answer.find({ query_id: queryId, is_deleted: false })
    .sort({ is_accepted: -1, like_count: -1, createdAt: 1 })
    .populate('author_id', 'name')
    .lean();

  let likedSet = new Set();
  if (viewerId && answers.length) {
    const likes = await Like.find({
      user_id: viewerId,
      answer_id: { $in: answers.map((a) => a._id) },
    })
      .select('answer_id')
      .lean();
    likedSet = new Set(likes.map((l) => String(l.answer_id)));
  }

  return answers.map((a) => ({
    ...serializeAnswer(a, viewerId),
    liked_by_me: likedSet.has(String(a._id)),
  }));
}

/** Toggle a like on an answer (one per user). Awards/removes the author's like points. */
export async function toggleLike(user, answerId) {
  const answer = await Answer.findOne({ _id: answerId, is_deleted: false });
  if (!answer) throw ApiError.notFound('Answer not found');
  if (String(answer.author_id) === String(user._id)) {
    throw ApiError.badRequest('You cannot like your own answer');
  }

  const existing = await Like.findOne({ answer_id: answer._id, user_id: user._id });
  if (existing) {
    await existing.deleteOne();
    answer.like_count = Math.max(0, answer.like_count - 1);
    await answer.save();
    await User.updateOne({ _id: answer.author_id }, { $inc: { points: -POINTS.ANSWER_LIKED } });
    return { liked: false, like_count: answer.like_count };
  }

  await Like.create({ answer_id: answer._id, user_id: user._id });
  answer.like_count += 1;
  await answer.save();
  await User.updateOne({ _id: answer.author_id }, { $inc: { points: POINTS.ANSWER_LIKED } });
  await notify({
    recipientId: answer.author_id,
    type: NOTIFICATION_TYPE.LIKE,
    title: 'Someone liked your answer',
    link: `/queries/${answer.query_id}`,
    queryId: answer.query_id,
    answerId: answer._id,
  });
  return { liked: true, like_count: answer.like_count };
}

/** Soft-delete an answer (author or admin). */
export async function deleteAnswer(user, answerId) {
  const answer = await Answer.findOne({ _id: answerId, is_deleted: false });
  if (!answer) throw ApiError.notFound('Answer not found');
  const isOwner = String(answer.author_id) === String(user._id);
  if (!isOwner && user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden('You can only delete your own answer');
  }
  answer.is_deleted = true;
  answer.deleted_at = new Date();
  await answer.save();
  return { ok: true };
}

/** Report a query or answer as faulty; records it on the doc and in the moderation queue. */
export async function reportContent(user, { targetType, targetId, reason }) {
  const Model = targetType === 'answer' ? Answer : targetType === 'query' ? Query : null;
  if (!Model) throw ApiError.badRequest('Report target must be "query" or "answer"');

  const doc = await Model.findOne({ _id: targetId, is_deleted: false });
  if (!doc) throw ApiError.notFound(`${targetType} not found`);

  const cleanReason = String(reason ?? '').slice(0, 500);
  doc.reports.push({ reporter_id: user._id, reason: cleanReason });
  await doc.save();

  await ModerationQueue.create({
    type: MODERATION_TYPE.REPORT,
    query_id: targetType === 'query' ? doc._id : doc.query_id ?? null,
    answer_id: targetType === 'answer' ? doc._id : null,
    reason: cleanReason,
    raised_by: user._id,
  });
  return { ok: true };
}
