import test from 'node:test';
import assert from 'node:assert/strict';
import { generateVariants, variantTask, lexicalDiversity } from './variants.js';
import { misreadTask, mitigateMisread } from './misread.js';
import { deterministicStyle, parseTextFile, extractStyle } from './style.js';
import { validateStyleProfile } from '../../validation/styleProfile.js';
import { ownerFilter, savedVersion } from '../../controllers/history.js';
import { tokenHash } from '../../middleware/anonymousSession.js';
import { rewriteWithIntelligence } from '../fidelity/intelligenceService.js';

const input = { draft: 'Please review the report.', persona: 'executive', tone: 'professional', length: 'balanced', purpose: 'request', audience: 'project team' };
const candidate = (text, styleId) => ({ styleId, rewrittenText: text, persona: 'executive', tone: 'professional', purpose: 'request', summary: 'Test fixture only.', changeReasons: [], warnings: [] });
const variants = [candidate('Please review the report.', 'concise'), candidate('Could you take a look at the report and share your thoughts?', 'balanced'), candidate('I would appreciate your perspective on the report when you have a chance.', 'diplomatic')];

test('variants use one structured batch and attach real per-candidate deterministic checks', async () => {
  let batches = 0, evaluations = 0;
  const service = { structured: async (task) => {
    if (task.schema.properties.variants) { batches++; return { ...task.parse(JSON.stringify({ variants })), metadata: { provider: 'mock' } }; }
    evaluations++; throw new Error('Evaluation unavailable');
  } };
  const response = await generateVariants(input, { service });
  assert.equal(batches, 1); assert.equal(evaluations, 3);
  assert.equal(response.variants.length, 3);
  assert.equal(new Set(response.variants.map((item) => item.id)).size, 3);
  assert.ok(response.variants.every((item) => item.diff.length && item.fidelity.status !== 'pass' && item.contractValidation));
  assert.equal(lexicalDiversity('Same words.', 'same words!'), 0);
});

test('incomplete and duplicate-style batches are rejected; indistinguishable candidates never become three successes', async () => {
  const task = variantTask(input);
  assert.throws(() => task.parse(JSON.stringify({ variants: variants.slice(0, 2) })), { code: 'AI_INVALID_RESPONSE' });
  assert.throws(() => task.parse(JSON.stringify({ variants: [variants[0], variants[0], variants[2]] })), { code: 'AI_INVALID_RESPONSE' });
  await assert.rejects(generateVariants(input, { service: { structured: async () => ({ variants: variants.map((item) => ({ ...item, rewrittenText: 'same words' })) }) } }), { code: 'VARIANTS_TOO_SIMILAR' });
});

test('simulations require actual text evidence and normalized urgency; mitigation validates the selected phrase', async () => {
  const task = misreadTask('Please review the report.', ['executive']);
  const interpretation = { perspective: 'executive', expectedAsk: 'Review', expectedActions: ['Read the report'], perceivedTone: 'Direct', perceivedUrgency: .5, ambiguities: [{ phrase: 'Please review', interpretation: 'Scope unclear', mitigation: 'Clarify scope only if supported.' }], possibleMisunderstandings: [] };
  assert.ok(task.parse(JSON.stringify({ interpretations: [interpretation] })));
  assert.throws(() => task.parse(JSON.stringify({ interpretations: [{ ...interpretation, perceivedUrgency: 2 }] })), { code: 'AI_INVALID_RESPONSE' });
  assert.throws(() => task.parse(JSON.stringify({ interpretations: [{ ...interpretation, ambiguities: [{ phrase: 'invented evidence', interpretation: 'x', mitigation: 'x' }] }] })), { code: 'AI_INVALID_RESPONSE' });
  await assert.rejects(mitigateMisread({ ...input, rewrittenText: 'Please review the report.', ambiguity: { phrase: 'missing', mitigation: 'Clarify' } }), { code: 'INVALID_INPUT' });
});

test('file parsing rejects binary, invalid UTF-8, extensions and size before analysis', () => {
  assert.equal(parseTextFile(Buffer.from('Hello\nworld'), 'sample.txt', 'text/plain'), 'Hello\nworld');
  for (const [buffer, name, mime] of [[Buffer.from([0, 1]), 'bad.txt', 'text/plain'], [Buffer.from([0xff]), 'bad.txt', 'text/plain'], [Buffer.from('hello'), 'bad.png', 'image/png'], [Buffer.alloc(17000, 'a'), 'big.txt', 'text/plain']]) {
    assert.throws(() => parseTextFile(buffer, name, mime), { code: 'INVALID_FILE' });
  }
});

test('style profiles are separate from exemplar content and have honest missing-provider state', async () => {
  const exemplar = 'Hi team,\n\nMaybe review this.\n- Consider the scope.\n\nThanks';
  const deterministic = deterministicStyle(exemplar);
  assert.equal(deterministic.greeting, 'casual'); assert.ok(deterministic.bulletFraction > 0);
  const extracted = await extractStyle({ exemplar }, { service: { structured: async () => { throw new Error('No provider'); } } });
  assert.equal(extracted.qualitativeStatus, 'unavailable'); assert.equal(extracted.profile.formality, null);
  assert.ok(!JSON.stringify(extracted.profile).includes('review this'));
  assert.throws(() => validateStyleProfile({ ...extracted.profile, warmth: 2 }), { code: 'INVALID_INPUT' });
});

test('history ownership filters bind every record id to the server-resolved session; records whitelist data', () => {
  const id = '0123456789abcdef01234567';
  assert.deepEqual(ownerFilter('server-owner', id), { _id: id, owner: 'server-owner' });
  assert.notDeepEqual(ownerFilter('another-owner', id), ownerFilter('server-owner', id));
  assert.throws(() => ownerFilter('server-owner', 'not-an-id'), { code: 'NOT_FOUND' });
  const version = savedVersion({ ...input, rewrittenText: 'Please review the report.', apiKey: 'not-to-store', userId: 'forged', metadata: { provider: 'mock', secret: 'not-to-store' } }, 1);
  assert.ok(!JSON.stringify(version).includes('not-to-store'));
  assert.ok(!JSON.stringify(version).includes('forged'));
  assert.equal(tokenHash('issued-token').length, 64); assert.notEqual(tokenHash('issued-token'), tokenHash('another-token'));
});

test('server-created mitigation tasks use the existing intelligence workflow, not an unchecked competing engine', async () => {
  let calls = 0;
  const result = await rewriteWithIntelligence(input, { config: { timeoutMs: 1000, maxRepairs: 0 }, generationTask: { marker: true }, service: {
    rewrite: async () => { throw new Error('Wrong path'); },
    structured: async (task) => { if (task.marker) { calls++; return candidate(input.draft, 'concise'); } throw new Error('Evaluator unavailable'); },
  } });
  assert.equal(calls, 1); assert.ok(result.diff); assert.equal(result.fidelity.evaluationStatus, 'unavailable');
});
