import crypto from 'node:crypto';
import { Query } from '../models/Query.js';
import { ai } from '../config/ai.js';

const embeddingText = (title, body) => `${title}\n\n${body}`.trim();
const hashText = (text) => crypto.createHash('sha256').update(text).digest('hex');

/**
 * Embedding refresh (Milestone 7). Re-embeds queries whose stored embedding_hash
 * no longer matches their current text (edits that bypassed the normal hook, or
 * an embedding-model change). Unchanged content is skipped — never re-embedded.
 * @returns {Promise<{ refreshed: number }>}
 */
export async function embeddingRefresh() {
  const queries = await Query.find({ is_deleted: false }).select('title body embedding_hash');
  let refreshed = 0;

  for (const query of queries) {
    const text = embeddingText(query.title, query.body);
    const hash = hashText(text);
    if (hash === query.embedding_hash) continue;
    query.embedding = await ai.embed(text);
    query.embedding_hash = hash;
    await query.save();
    refreshed += 1;
  }
  return { refreshed };
}

export default embeddingRefresh;
