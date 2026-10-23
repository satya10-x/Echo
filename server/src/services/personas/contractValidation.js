import { words } from '../diff/diffService.js';
import { getPersona } from './registry.js';
export function validateContract(input, rewritten, evaluation) {
  const contract = getPersona(input.persona);
  const checks = [];
  const count = words(rewritten).length;
  checks.push({ id: 'word_limit', status: count <= contract.maxWords ? 'pass' : 'warning', source: 'deterministic', explanation: `${count} words; persona target at most ${contract.maxWords}. Preserve source facts even if the limit cannot be met.`, repairable: count > contract.maxWords && words(input.draft).length <= contract.maxWords });
  const banned = contract.bannedPatterns.filter(({ pattern }) => new RegExp(pattern, 'iu').test(rewritten));
  checks.push({ id: 'banned_patterns', status: banned.length ? 'review_required' : 'pass', source: 'deterministic', explanation: banned.length ? banned.map((item) => item.reason).join(' ') : 'No configured banned wording matched. This is a limited pattern check.', repairable: banned.length > 0 });
  const formatOk = !/^\s*```|^\s*\{\s*"rewrittenText"/u.test(rewritten);
  checks.push({ id: 'output_format', status: formatOk ? 'pass' : 'review_required', source: 'deterministic', explanation: formatOk ? 'Communication text is separate from JSON metadata.' : 'Output includes formatting or metadata that belongs outside the message.', repairable: !formatOk });
  for (const element of contract.requiredElements) {
    const check = evaluation?.contractChecks.find((item) => item.id === element.id);
    checks.push(check ? { ...check, source: 'model', repairable: check.status === 'review_required' } : { id: element.id, status: 'unavailable', source: 'model', explanation: `${element.description} Interpretation unavailable; do not invent missing information to satisfy this requirement.`, repairable: false });
  }
  // Register targets are advisory; the user's selected tone takes precedence.
  return { status: checks.some((item) => item.status === 'review_required') ? 'review_required' : checks.some((item) => ['warning', 'unavailable'].includes(item.status)) ? 'warning' : 'pass', persona: contract, checks, registerNote: 'Register ranges are advisory estimates. The selected tone and source seriousness take precedence.' };
}
