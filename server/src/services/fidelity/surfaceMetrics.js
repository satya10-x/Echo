import { words } from '../diff/diffService.js';
export function surfaceMetrics(original, rewritten, diff) {
  const originalWords = words(original).length, rewrittenWords = words(rewritten).length;
  let inserted = 0, removed = 0, modified = 0;
  for (const segment of diff.segments) {
    if (segment.type === 'added') inserted += words(segment.rewrittenText).length;
    if (segment.type === 'removed') removed += words(segment.originalText).length;
    if (segment.type === 'modified') {
      const before = words(segment.originalText).length, after = words(segment.rewrittenText).length;
      modified += Math.min(before, after); removed += Math.max(0, before - after); inserted += Math.max(0, after - before);
    }
  }
  return {
    originalWords, rewrittenWords, originalCharacters: [...original].length, rewrittenCharacters: [...rewritten].length,
    insertedTokens: inserted, removedTokens: removed, modifiedTokens: modified,
    wordEditRatio: diff.status === 'complete' ? Math.min(1, (inserted + removed + modified) / Math.max(1, originalWords, rewrittenWords)) : null,
    method: 'Unicode word runs; adjacent replacement runs pair tokens by count. Ratio measures surface edits, not semantic drift.',
    readability: { status: 'unavailable', explanation: 'No language-specific readability estimate is calculated. English formulas are not applied to Hindi, Hinglish or other languages.' },
  };
}
