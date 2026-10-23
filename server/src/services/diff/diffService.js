import { createHash } from 'node:crypto';
import { diffWordsWithSpace } from 'diff';

export const words = (text) => text.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) || [];
export function createDiff(original, rewritten) {
  const parts = diffWordsWithSpace(original, rewritten, { timeout: 150, maxEditLength: 3000 });
  const coarse = !parts;
  const chunks = parts || [{ removed: true, value: original }, { added: true, value: rewritten }];
  const segments = [];
  let oldOffset = 0, newOffset = 0;
  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i];
    let originalText = '', rewrittenText = '';
    if (!part.added && !part.removed) originalText = rewrittenText = part.value;
    else {
      // Adjacent deletes/inserts form one observed replacement, not a semantic equivalence claim.
      let j = i;
      while (j < chunks.length && (chunks[j].added || chunks[j].removed)) {
        if (chunks[j].removed) originalText += chunks[j].value;
        else rewrittenText += chunks[j].value;
        j++;
      }
      i = j - 1;
    }
    const type = originalText === rewrittenText ? 'unchanged' : originalText && rewrittenText ? 'modified' : originalText ? 'removed' : 'added';
    const segment = {
      id: createHash('sha256').update(JSON.stringify([oldOffset, newOffset, originalText, rewrittenText])).digest('hex').slice(0, 16),
      originalText, rewrittenText, type, category: 'other', severity: 'low',
      originalStart: oldOffset, originalEnd: oldOffset + originalText.length,
      rewrittenStart: newOffset, rewrittenEnd: newOffset + rewrittenText.length,
      restorable: !coarse && ['modified', 'removed'].includes(type),
      explanation: type === 'unchanged' ? '' : 'Observed text edit. A wording change alone does not establish a meaning change.',
    };
    oldOffset += originalText.length; newOffset += rewrittenText.length;
    segments.push(segment);
  }
  return { segments, status: coarse ? 'coarse' : 'complete' };
}
export function restoreSegment(original, rewritten, segmentId) {
  const { segments } = createDiff(original, rewritten);
  const segment = segments.find((item) => item.id === segmentId);
  if (!segment?.restorable || rewritten.slice(segment.rewrittenStart, segment.rewrittenEnd) !== segment.rewrittenText) return null;
  // Offsets address this exact revision; never search/replace a potentially repeated phrase.
  return rewritten.slice(0, segment.rewrittenStart) + segment.originalText + rewritten.slice(segment.rewrittenEnd);
}
