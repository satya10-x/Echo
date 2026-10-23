import { dimensions } from './semanticAnalysis.js';
export function toneAnalysis(evaluation) {
  if (!evaluation) return { status: 'unavailable', explanation: 'Model-assisted tone evaluation could not be completed.' };
  return { status: 'available', before: evaluation.tone.before, after: evaluation.tone.after, delta: Object.fromEntries(dimensions.map((key) => [key, Number((evaluation.tone.after[key] - evaluation.tone.before[key]).toFixed(2))])), explanation: 'Model estimates on 0–1 scales: casual→formal, tentative→direct, detached→supportive, unhurried→immediate. Not psychological measurements.' };
}
