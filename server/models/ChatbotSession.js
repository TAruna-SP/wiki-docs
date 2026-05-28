import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    source_tier: { type: String, enum: ['faq', 'community', 'ai', 'fallback', null], default: null },
    citations: {
      type: [
        {
          kind: { type: String, enum: ['faq', 'query'] },
          ref_id: mongoose.Schema.Types.ObjectId,
          title: String,
        },
      ],
      default: [],
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const chatbotSessionSchema = new mongoose.Schema(
  {
    session_token: { type: String, required: true, unique: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
);

export const ChatbotSession = mongoose.model('ChatbotSession', chatbotSessionSchema);
export default ChatbotSession;
