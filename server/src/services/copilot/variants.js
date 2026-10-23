import { createHash } from 'node:crypto';
import { aiService } from '../ai/aiService.js';
import { validateRewrite } from '../../validation/rewrite.js';
import { buildPrompts, responseSchema } from '../ai/prompts/rewritePrompts.js';
import { parseRewrite } from '../ai/response.js';
import { analyzePair } from '../fidelity/fidelityService.js';
import { revisionOf } from '../fidelity/intelligenceService.js';
import { words } from '../diff/diffService.js';
import { AIError } from '../ai/errors.js';
import { objectSchema, arraySchema, enumSchema, parseJSON, malformed } from './structured.js';
export const variantStyles = [
  { id: 'concise', name: 'Clear & Concise', description: 'Direct, compact, and free of unnecessary filler.' },
  { id: 'balanced', name: 'Professional & Balanced', description: 'Polished and natural, with room for useful context.' },
  { id: 'diplomatic', name: 'Diplomatic & Empathetic', description: 'Tactful, considerate, and relationship-aware.' },
];
export function lexicalDiversity(first, second) {
  const a = new Set(words(first.toLowerCase())), b = new Set(words(second.toLowerCase()));
  const union = new Set([...a, ...b]);
  return union.size ? 1 - [...a].filter((word) => b.has(word)).length / union.size : 0;
}
export function variantTask(input) {
  const itemSchema = responseSchema(input);
  const schema = objectSchema({ variants: arraySchema(objectSchema({ styleId: enumSchema(variantStyles.map((style) => style.id)), ...itemSchema.properties })) });
  const prompts = buildPrompts(input);
  return {
    schema, maxTokens: Math.min(12000, Math.max(3000, Math.ceil(input.draft.length * 1.5) + 1500)),
    prompts: { system: prompts.system + `\nInstead of a single result, return exactly three distinct candidates with styles ${JSON.stringify(variantStyles)}. All must honor the SAME selected persona, tone, purpose, audience, original facts and conditions. Styles change emphasis, rhythm and structure, not facts. Do not merely swap punctuation or alter capitalization. When selected tone conflicts with a style label, preserve the selected tone and vary structure and tact. Return only JSON matching ${JSON.stringify(schema)}`, user: prompts.user },
    parse(raw) {
      const data = parseJSON(raw);
      if (!Array.isArray(data?.variants) || data.variants.length !== 3) return malformed();
      const seen = new Set();
      const variants = data.variants.map((item) => {
        if (!item || !variantStyles.some((style) => style.id === item.styleId) || seen.has(item.styleId)) return malformed();
        seen.add(item.styleId);
        return { ...parseRewrite(JSON.stringify(item), input), styleId: item.styleId };
      });
      return { variants };
    },
  };
}
export async function generateVariants(rawInput, { signal, service = aiService } = {}) {
  const input = validateRewrite(rawInput);
  const batch = await service.structured(variantTask(input), { signal });
  const diversity = [];
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
    const distance = lexicalDiversity(batch.variants[i].rewrittenText, batch.variants[j].rewrittenText);
    if (distance < 0.08) throw new AIError('VARIANTS_TOO_SIMILAR', 'The provider did not produce three sufficiently distinct versions. Your active rewrite is unchanged; try again or use a longer draft.', 422);
    diversity.push({ first: i, second: j, distance });
  }
  // One batch generation, then bounded concurrent evaluation; no per-candidate regeneration loop.
  const results = [];
  let next = 0;
  async function worker() {
    while (next < batch.variants.length) {
      const index = next++, variant = batch.variants[index];
      const analysis = await analyzePair(input, variant.rewrittenText, { signal, service });
      const warnings = [...variant.warnings];
      if (analysis.fidelity.status !== 'pass' || analysis.contractValidation.status !== 'pass') warnings.push('Review this candidate’s checks before using it.');
      const findings = analysis.commitmentLedger.changes.filter((item) => item.status !== 'preserved');
      const rank = {
        critical: findings.filter((item) => item.severity === 'critical').length,
        high: findings.filter((item) => item.severity === 'high').length,
        fidelityConcerns: analysis.fidelity.contradictions.length + analysis.fidelity.missingPoints.length + analysis.fidelity.unsupportedClaims.length,
        unavailable: analysis.fidelity.evaluationStatus === 'available' ? 0 : 1,
        contractConcerns: analysis.contractValidation.checks.filter((item) => !['pass', 'not_applicable'].includes(item.status)).length,
        diversity: Number((diversity.filter((pair) => pair.first === index || pair.second === index).reduce((sum, pair) => sum + pair.distance, 0) / 2).toFixed(3)),
      };
      results[index] = { ...variant, ...variantStyles.find((style) => style.id === variant.styleId), ...analysis, warnings, originalText: input.draft, id: createHash('sha256').update(JSON.stringify([input, variant.styleId, variant.rewrittenText])).digest('hex').slice(0, 20), revision: revisionOf(input.draft, variant.rewrittenText), metadata: batch.metadata, rank };
    }
  }
  await Promise.all([worker(), worker()]);
  results.sort((a, b) => {
    for (const field of ['critical', 'high', 'fidelityConcerns', 'unavailable', 'contractConcerns']) if (a.rank[field] !== b.rank[field]) return a.rank[field] - b.rank[field];
    return b.rank.diversity - a.rank.diversity;
  });
  return { variants: results, rankingMethod: 'Ordered by fewer critical findings, high findings, semantic discrepancies, unavailable evaluations, and contract concerns; lexical variety breaks ties. Lexical variety is a surface signal, not proof of meaning or stylistic difference.' };
}
