// Pure request preparation only. Prompt 3 can submit this through services/api.js.
export function createRewritePayload({ draft, persona, tone, length, purpose, audience }) {
  return { originalDraft: draft.trim(), persona, tone, outputLength: length, purpose, audience: audience.trim() };
}
