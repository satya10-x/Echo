import { aiService } from '../ai/aiService.js';
import { intelligenceConfig } from '../../config/env.js';
import { createDiff } from '../diff/diffService.js';
import { surfaceMetrics } from './surfaceMetrics.js';
import { evaluationTask } from './semanticAnalysis.js';
import { toneAnalysis } from './toneAnalysis.js';
import { commitmentLedger, severityRank } from '../commitments/commitmentService.js';
import { validateContract } from '../personas/contractValidation.js';

export async function analyzePair(input, rewrittenText, { signal, service = aiService } = {}) {
  const diff = createDiff(input.draft, rewrittenText);
  let evaluation = null, evaluationProvider = null;
  try {
    const { metadata, ...result } = await service.structured(evaluationTask(input, rewrittenText, diff), { signal });
    evaluation = result; evaluationProvider = metadata;
  } catch {
    if (signal?.aborted && signal.reason?.message === 'Client disconnected') throw signal.reason;
    // Deterministic checks are still returned; failed/malformed evaluation can never silently pass.
  }
  const ledger = commitmentLedger(input.draft, rewrittenText, evaluation?.commitments, Boolean(evaluation));
  const points = evaluation?.propositions || [];
  const preservedPoints = points.filter((point) => point.status === 'preserved');
  const missingPoints = points.filter((point) => ['missing', 'uncertain'].includes(point.status));
  const contradictions = points.filter((point) => point.status === 'contradicted');
  const unsupportedClaims = evaluation?.unsupportedClaims || [];
  const coverage = points.length ? preservedPoints.length / points.length : null;
  const exactConcern = ledger.changes.some((item) => ['critical', 'high'].includes(item.severity));
  const status = !evaluation ? (exactConcern ? 'review_required' : 'warning') : contradictions.length || unsupportedClaims.length || missingPoints.length || exactConcern || coverage < intelligenceConfig.minCoverage ? 'review_required' : 'pass';
  const fidelity = {
    status, evaluationStatus: evaluation ? 'available' : 'unavailable', preservedPoints, missingPoints, contradictions, unsupportedClaims,
    propositionCoverage: coverage, coverageLabel: 'Fraction of model-identified points marked preserved; a heuristic, not a truth probability. The evaluator may miss propositions.',
    explanation: !evaluation ? 'Semantic evaluation is unavailable. Deterministic checks remain available; meaning preservation has not been confirmed.' : status === 'pass' ? 'The evaluator found no discrepancies among the points it identified. This is not a guarantee of equivalence; review consequential communication.' : 'Potential discrepancies or exact-value changes need your review. Conservative exact checks may also flag harmless paraphrases.',
    embedding: { status: 'unavailable', explanation: 'No optional embedding provider is configured. No paid embedding API is required.' },
    provider: evaluationProvider,
  };
  for (const segment of diff.segments) {
    const explained = evaluation?.edits.find((edit) => edit.segmentId === segment.id);
    if (explained) { segment.category = explained.category; segment.explanation = explained.explanation; segment.explanationSource = 'model'; }
    if (segment.type === 'unchanged') continue;
    const concerns = ledger.changes.filter((item) => item.status !== 'preserved' && ((item.originalText && segment.originalText.includes(item.originalText)) || (item.rewrittenText && segment.rewrittenText.includes(item.rewrittenText)) || (segment.originalText.trim() && item.originalText.includes(segment.originalText.trim())) || (segment.rewrittenText.trim() && item.rewrittenText.includes(segment.rewrittenText.trim()))));
    concerns.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
    if (concerns[0]) { segment.severity = concerns[0].severity; segment.category = /number|value|entity|name|identifier|technical/.test(concerns[0].type) ? 'fact' : 'commitment'; }
  }
  return { diff: diff.segments, diffStatus: diff.status, surface: surfaceMetrics(input.draft, rewrittenText, diff), fidelity, commitmentLedger: ledger, toneShift: toneAnalysis(evaluation), contractValidation: validateContract(input, rewrittenText, evaluation) };
}
