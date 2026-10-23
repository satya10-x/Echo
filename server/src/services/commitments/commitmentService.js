// Exact occurrences are protected; missing matches are review signals, not proof of changed meaning.
export const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };
const patterns = [
  ['deadline', /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|today|tomorrow|yesterday|next week|next month)\b(?:\s+\d{1,2}(?:,?\s+\d{4})?)?|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/giu],
  ['number', /(?<![\p{L}\p{N}_])(?:[$€£₹]\s*)?\d+(?:[,.]\d+)*(?:\s*%|\s*(?:USD|EUR|INR|GBP))?(?![\p{L}\p{N}_])/gu],
  ['identifier', /\b(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)+\b|\b[A-Z]{2,}[A-Z0-9]*\b/g],
  ['name', /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g],
  ['technical_term', /`[^`\n]{1,80}`/g],
];
const clauses = [
  ['prohibition', /\b(?:do not|don't|must not|cannot|can't|not allowed|never|no longer|not)\b[^.!?\n]*/gi, 'critical'],
  ['condition', /\b(?:only if|unless|subject to|provided that|pending approval|requires? approval)\b[^.!?\n]*/gi, 'critical'],
  ['promise', /\b(?:I|we)\s+(?:will|promise|commit|guarantee)\b[^.!?\n]*/gi, 'critical'],
  ['obligation', /\b(?:must|required to|responsible for|shall|needs to)\b[^.!?\n]*/gi, 'high'],
  ['approval', /\b(?:approval|approved|sign-off|consent|dependent on)\b[^.!?\n]*/gi, 'high'],
];
function exactValues(text) {
  const values = [];
  for (const [kind, pattern] of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (kind === 'name' && /^(?:Please|The|This|That|We|You|It|Our|Your|They|If|Only|Do|No|Not|Approval|Review|Keep|Thanks|Hello|Hi|Dear|Friday|Monday|Tuesday|Wednesday|Thursday|Saturday|Sunday)$/u.test(match[0])) continue;
      values.push({ kind, text: match[0], start: match.index, end: match.index + match[0].length });
    }
  }
  return values;
}
export function commitmentLedger(original, rewritten, assisted = [], evaluationAvailable = false) {
  const changes = [];
  const before = exactValues(original), after = exactValues(rewritten);
  const remaining = [...after];
  for (const value of before) {
    const index = remaining.findIndex((item) => item.kind === value.kind && item.text === value.text);
    const match = index >= 0 ? remaining.splice(index, 1)[0] : null;
    changes.push({ type: `${value.kind}_${match ? 'preserved' : 'unmatched'}`, severity: match ? 'low' : 'high', status: match ? 'preserved' : 'removed', originalText: value.text, rewrittenText: match?.text || '', source: 'deterministic', confidence: value.kind === 'name' ? 'candidate' : 'exact', originalStart: value.start, rewrittenStart: match?.start ?? null, explanation: match ? 'An exact occurrence is present in both texts. This does not verify its context or meaning.' : 'No exact counterpart was matched. Check for a changed value, paraphrase or omission; this is not a confirmed semantic deletion.' });
  }
  for (const value of remaining) changes.push({ type: `${value.kind}_introduced`, severity: 'high', status: 'added', originalText: '', rewrittenText: value.text, source: 'deterministic', confidence: value.kind === 'name' ? 'candidate' : 'exact', rewrittenStart: value.start, explanation: 'This exact occurrence was not matched in the source. Review whether it introduces a new fact or merely reformats one.' });
  for (const [kind, pattern, severity] of clauses) {
    for (const match of original.matchAll(pattern)) {
      if (!rewritten.includes(match[0])) changes.push({ type: `${kind}_review`, severity, status: 'modified', originalText: match[0], rewrittenText: '', source: 'deterministic', confidence: 'candidate', explanation: 'A consequential source phrase is not reproduced exactly. It may be paraphrased; review the model-assisted evidence before accepting it as equivalent.' });
    }
    if (kind === 'promise') for (const match of rewritten.matchAll(pattern)) {
      if (!original.includes(match[0])) changes.push({ type: 'promise_introduced', severity, status: 'added', originalText: '', rewrittenText: match[0], source: 'deterministic', confidence: 'candidate', explanation: 'Potential new commitment. Verify that the original supports this promise.' });
    }
  }
  changes.push(...assisted.map((item) => ({ ...item, source: 'model', confidence: 'estimate' })));
  changes.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return { status: changes.some((item) => item.severity === 'critical' || item.severity === 'high') ? 'review_required' : evaluationAvailable ? 'pass' : 'warning', changes, modelStatus: evaluationAvailable ? 'available' : 'unavailable', explanation: 'Exact checks are conservative and incomplete. Names are candidates; English clause patterns do not cover every language. Matching numbers alone does not prove safety.' };
}
