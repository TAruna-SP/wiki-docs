import mongoose from 'mongoose';
import { NOTIFICATION_TYPE } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPE), required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    link: { type: String, default: null }, // client-side route

    related_query_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Query', default: null },
    related_answer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', default: null },

    is_read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
