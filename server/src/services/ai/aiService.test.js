import test from 'node:test';
import assert from 'node:assert/strict';
import { createAIService } from './aiService.js';
import { validateRewrite } from '../../validation/rewrite.js';
import { AIError } from './errors.js';

const input = { draft: 'Review on Friday. Do not promise approval.', persona: 'executive', tone: 'professional', length: 'balanced', purpose: 'inform', audience: '' };
const config = { primary: 'groq', fallbackEnabled: true, timeoutMs: 100, providers: { groq: { apiKey: 'test-only', model: 'test-model' }, gemini: { apiKey: 'test-only', model: 'test-model' } } };
const valid = () => JSON.stringify({ rewrittenText: input.draft, persona: input.persona, tone: input.tone, purpose: input.purpose, summary: 'Test fixture only.', changeReasons: [], warnings: [] });

test('invalid input and missing primary configuration make no provider calls', async () => {
  let calls = 0;
  const factories = { groq: () => { calls++; return {}; } };
  const service = createAIService(config, factories);
  for (const patch of [{ draft: '' }, { draft: 'x'.repeat(10001) }, { persona: 'unknown' }, { tone: 'unknown' }, { length: 'unknown' }, { purpose: 'unknown' }, { audience: 'x'.repeat(161) }, { refinement: 'x'.repeat(501) }]) {
    await assert.rejects(service.rewrite({ ...input, ...patch }), { code: 'INVALID_INPUT', status: 400 });
  }
  await assert.rejects(createAIService({ ...config, providers: {} }, factories).rewrite(input), { code: 'AI_NOT_CONFIGURED' });
  assert.equal(calls, 0);
  assert.equal(validateRewrite({ ...input, persona: ' SUPPORTIVE ', refinement: ' softer ' }).persona, 'supportive');
});

test('valid primary result does not cause duplicate generation', async () => {
  const calls = [];
  const factories = Object.fromEntries(['groq', 'gemini'].map((name) => [name, () => ({ generate: async () => { calls.push(name); return valid(); } })]));
  const result = await createAIService(config, factories).rewrite(input);
  assert.deepEqual(calls, ['groq']);
  assert.equal(result.metadata.provider, 'groq');
  assert.equal(result.metadata.fallbackUsed, false);
});

test('transient failure falls back once; authentication failures do not', async () => {
  let secondaryCalls = 0;
  const factories = { groq: () => ({ generate: async () => { throw { status: 429 }; } }), gemini: () => ({ generate: async () => { secondaryCalls++; return valid(); } }) };
  assert.equal((await createAIService(config, factories).rewrite(input)).metadata.provider, 'gemini');
  assert.equal(secondaryCalls, 1);
  factories.groq = () => ({ generate: async () => { throw { status: 401, message: 'secret must not escape' }; } });
  await assert.rejects(createAIService(config, factories).rewrite(input), (error) => error.code === 'AI_CONFIGURATION' && !error.message.includes('secret'));
  assert.equal(secondaryCalls, 1);
  await assert.rejects(createAIService({ ...config, fallbackEnabled: false }, { ...factories, groq: () => ({ generate: async () => { throw { status: 429 }; } }) }).rewrite(input), { code: 'AI_UNAVAILABLE' });
});

test('malformed JSON is repaired only once, never fabricated or routed as a transient failure', async () => {
  let calls = 0;
  const service = createAIService(config, { groq: () => ({ generate: async (_input, options) => { calls++; return options.repair ? valid() : '{broken'; } }) });
  assert.equal((await service.rewrite(input)).rewrittenText, input.draft);
  assert.equal(calls, 2);
  calls = 0;
  const broken = createAIService(config, { groq: () => ({ generate: async () => { calls++; return '{}'; } }) });
  await assert.rejects(broken.rewrite(input), { code: 'AI_INVALID_RESPONSE' });
  assert.equal(calls, 2);
});

test('timeout aborts transport and tries fallback; client cancellation never falls back', async () => {
  let secondaryCalls = 0;
  let aborted = false;
  const factories = {
    groq: () => ({ generate: async (_input, { signal }) => new Promise(() => { signal.addEventListener('abort', () => { aborted = true; }); }) }),
    gemini: () => ({ generate: async () => { secondaryCalls++; return valid(); } }),
  };
  const result = await createAIService({ ...config, timeoutMs: 15 }, factories).rewrite(input);
  assert.equal(result.metadata.fallbackUsed, true);
  assert.equal(aborted, true);
  const controller = new AbortController();
  const pending = createAIService(config, factories).rewrite(input, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { code: 'REQUEST_CANCELLED' });
  assert.equal(secondaryCalls, 1);
});
