import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiff, restoreSegment } from '../diff/diffService.js';
import { commitmentLedger } from '../commitments/commitmentService.js';
import { analyzePair } from './fidelityService.js';
import { evaluationTask } from './semanticAnalysis.js';
import { rewriteWithIntelligence } from './intelligenceService.js';
import { validateAnalysis } from '../../validation/analyze.js';
import { getPersona } from '../personas/registry.js';

const input = { draft: 'Send the report.', persona: 'executive', tone: 'professional', length: 'balanced', purpose: 'inform', audience: '', refinement: '' };
function evaluation(source, rewritten, overrides = {}) {
  return {
    propositions: [{ point: 'Send the report.', sourceQuote: source, rewrittenQuote: rewritten, status: 'preserved', explanation: 'Test fixture only.' }],
    unsupportedClaims: [], commitments: [], tone: { before: { formality: .4, assertiveness: .5, warmth: .3, urgency: .2 }, after: { formality: .7, assertiveness: .6, warmth: .4, urgency: .2 } },
    contractChecks: getPersona('executive').requiredElements.map(({ id }) => ({ id, status: 'pass', explanation: 'Test fixture only.' })), edits: [], ...overrides,
  };
}
const failedEvaluator = { structured: async () => { throw new Error('Unavailable'); } };

test('typed diff reconstructs both texts exactly, including whitespace, Unicode and repeated phrases', () => {
  for (const [original, rewritten] of [['Hello  world!\nनमस्ते', 'Hello, world!\nनमस्ते दोस्त'], ['We can ship. We can ship.', 'We can ship. We cannot ship.'], ['One two', 'One'], ['same', 'same']]) {
    const diff = createDiff(original, rewritten);
    assert.equal(diff.segments.map((segment) => segment.originalText).join(''), original);
    assert.equal(diff.segments.map((segment) => segment.rewrittenText).join(''), rewritten);
    assert.deepEqual(diff, createDiff(original, rewritten));
    for (const segment of diff.segments) {
      assert.equal(rewritten.slice(segment.rewrittenStart, segment.rewrittenEnd), segment.rewrittenText);
      assert.equal(original.slice(segment.originalStart, segment.originalEnd), segment.originalText);
    }
  }
});

test('phrase restoration uses exact offsets and rejects unknown revision segment ids', () => {
  const original = 'We can ship. We can ship.', rewritten = 'We can ship. We cannot ship.';
  const segment = createDiff(original, rewritten).segments.find((item) => item.restorable);
  assert.equal(restoreSegment(original, rewritten, segment.id), original);
  assert.equal(restoreSegment(original, rewritten, 'ffffffffffffffff'), null);
  assert.throws(() => validateAnalysis({ ...input, rewrittenText: '', segmentId: 'bad' }), { code: 'INVALID_INPUT' });
});

test('exact ledger detects dates, names, repeated amounts and consequential negation candidates', () => {
  const ledger = commitmentLedger('Alice must pay $50 by Friday. Do not ship without approval. Budget $50.', 'Bob must pay $60 by Monday. Ship now. Budget $50.');
  assert.ok(ledger.changes.some((item) => item.originalText === 'Friday' && item.severity === 'high'));
  assert.ok(ledger.changes.some((item) => item.originalText === 'Alice' && item.status === 'removed'));
  assert.ok(ledger.changes.some((item) => item.type === 'prohibition_review' && item.severity === 'critical'));
  assert.ok(ledger.changes.some((item) => item.originalText === '$50' && item.status === 'removed'));
  assert.equal(ledger.status, 'review_required');
});

test('failed evaluator leaves semantic, tone and interpreted contract checks unavailable', async () => {
  const analysis = await analyzePair(input, 'Please send the report.', { service: failedEvaluator });
  assert.equal(analysis.fidelity.evaluationStatus, 'unavailable');
  assert.notEqual(analysis.fidelity.status, 'pass');
  assert.equal(analysis.toneShift.status, 'unavailable');
  assert.notEqual(analysis.contractValidation.status, 'pass');
});

test('model evidence, edit ids and normalized tone values must validate against real strings', () => {
  const rewritten = 'Please send the report.';
  const task = evaluationTask(input, rewritten, createDiff(input.draft, rewritten));
  assert.ok(task.parse(JSON.stringify(evaluation(input.draft, rewritten))).propositions.length);
  const fake = evaluation(input.draft, rewritten, { unsupportedClaims: [{ rewrittenQuote: 'An invented quote', explanation: 'Unverifiable' }] });
  assert.throws(() => task.parse(JSON.stringify(fake)), { code: 'AI_INVALID_RESPONSE' });
  const invalidTone = evaluation(input.draft, rewritten); invalidTone.tone.after.warmth = 2;
  assert.throws(() => task.parse(JSON.stringify(invalidTone)), { code: 'AI_INVALID_RESPONSE' });
  assert.throws(() => task.parse(JSON.stringify(evaluation(input.draft, rewritten, { edits: [{ segmentId: 'fake', category: 'tone', explanation: 'No real span' }] }))), { code: 'AI_INVALID_RESPONSE' });
});

test('generation has at most one targeted repair and re-evaluates the repaired draft', async () => {
  const original = { ...input, draft: 'Deliver on Friday.' };
  const candidate = { rewrittenText: 'Deliver on Monday.', persona: 'executive', tone: 'professional', purpose: 'inform', warnings: [], metadata: { provider: 'mock', model: 'mock' } };
  let repairs = 0, evaluations = 0;
  const service = {
    rewrite: async () => ({ ...candidate }),
    structured: async (task) => {
      if (task.prompts.system.includes('Perform one targeted preservation/persona repair')) { repairs++; return { ...candidate }; }
      evaluations++;
      return evaluation(original.draft, candidate.rewrittenText, { propositions: [{ point: 'Friday deadline', sourceQuote: 'Friday', rewrittenQuote: 'Monday', status: 'contradicted', explanation: 'The deadline changed.' }] });
    },
  };
  const result = await rewriteWithIntelligence(original, { service, config: { timeoutMs: 1000, maxRepairs: 1 } });
  assert.equal(repairs, 1); assert.equal(evaluations, 2);
  assert.equal(result.repair.attempts, 1); assert.equal(result.repair.outcome, 'review_required');
  assert.equal(result.fidelity.status, 'review_required');
  assert.equal(result.repair.previousText, candidate.rewrittenText);
});
