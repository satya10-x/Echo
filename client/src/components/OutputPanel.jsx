import { useEffect, useState } from 'react';
import { Copy, Info, RotateCcw, ShieldCheck, Sparkles, Undo2 } from 'lucide-react';
import { countWords } from '../hooks/useDraftWorkspace';
import { EmptyState, LoadingState } from './FeedbackState';
import { ReviewBanner, needsReview } from './IntelligencePanels';

export default function RewriteOutput({ result = null, status = 'idle', error = '', personaName, stale = false, acknowledged = false, onAcknowledge, onRefine, onRegenerate, onRestore }) {
  const [copyStatus, setCopyStatus] = useState('');
  const hasOutput = Boolean(result?.text);
  const busy = ['loading', 'analyzing'].includes(status);
  const reviewRequired = needsReview(result);
  useEffect(() => { setCopyStatus(''); }, [result]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(result.text);
      setCopyStatus('Copied to clipboard.');
    } catch {
      setCopyStatus('Copy wasn’t available. Select the message and copy it manually.');
    }
  }
  return <section className="editor-panel output-panel" aria-labelledby="output-title" aria-busy={busy}>
    <div className="panel-heading"><h2 id="output-title"><Sparkles size={17} /> Rewritten message</h2><span className="small-badge" role="status">{busy ? 'WRITING & CHECKING' : status === 'error' ? 'REQUEST FAILED' : hasOutput ? result.edited ? 'EDITED REWRITE' : 'AI REWRITE' : 'READY WHEN YOU ARE'}</span></div>
    {hasOutput && !busy && <ReviewBanner result={result} acknowledged={acknowledged} onAcknowledge={onAcknowledge} onRefine={onRefine} />}
    {status === 'error' && <div className="rewrite-error" role="alert"><Info size={18} /><div><strong>We couldn’t complete that rewrite.</strong><p>{error}</p>{hasOutput && <p>Your previous result is retained below.</p>}</div></div>}
    {busy ? <LoadingState label={status === 'analyzing' ? 'Rechecking your edited message…' : 'Writing and checking your message…'} /> : hasOutput ? <><div className="result-context"><span>{personaName} · {result.tone}</span><span>{result.metadata?.provider}{result.metadata?.fallbackUsed ? ' · fallback used' : ''}</span></div>{stale && <p className="result-stale">The draft or settings have changed. This result and comparison use the original source from the last completed rewrite.</p>}<div className="rewritten-text" tabIndex={0}>{result.text}</div></> : <EmptyState title="The right words are worth a little care."><p>Your rewritten message will appear here. Start with a draft and choose how you want it to land.</p><span className="coming-pill">Ready for your next message</span></EmptyState>}
    <div className="output-word-count">{hasOutput ? `${countWords(result.text)} words · ${result.text.length.toLocaleString()} characters` : 'No rewritten output yet'}</div>
    <div className="output-actions"><button className="button secondary" disabled={!hasOutput || busy || !onRegenerate} onClick={onRegenerate} title="Generate a fresh version of the same original draft with current settings"><RotateCcw size={14} /> Regenerate</button><button className="button secondary" disabled={!hasOutput || busy || !result.originalText || !onRestore} onClick={() => onRestore(result.originalText)} title="Restore the source draft used for this rewrite"><Undo2 size={14} /> Restore original</button><button className="button secondary" disabled={!hasOutput || busy || (reviewRequired && !acknowledged)} title={reviewRequired && !acknowledged ? 'Acknowledge the review warnings to enable copying' : 'Copy the current rewrite'} onClick={copy}><Copy size={14} /> Copy</button></div>
    <p className="copy-status" role="status">{copyStatus}</p>
    {!hasOutput && <p className="output-availability">Copy, regenerate and restore become available after a successful rewrite.</p>}
    <div className="output-insights"><div><span className="insight-icon"><Info size={17} /></span><div><h3>What changed and why?</h3>{hasOutput ? <><p>{result.summary}</p><ul className="change-reasons">{result.changeReasons?.map((reason, index) => <li key={index}><strong>{reason.category}</strong> — {reason.explanation}</li>)}</ul><p className="explanation-note">Generation explanation · See independent findings below</p></> : <p>Explanations will appear alongside real rewrites.</p>}</div></div>
    {result?.warnings?.length > 0 && <div className="model-warnings"><span className="insight-icon"><Info size={17} /></span><div><h3>Worth reviewing</h3><ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul><p>AI suggestions, not verified findings or legal review.</p></div></div>}
    <div><span className="insight-icon"><ShieldCheck size={17} /></span><div><h3>Fidelity & commitment checks</h3><p>{result?.fidelity ? `Separate semantic evaluation: ${result.fidelity.evaluationStatus}. Inspect the full findings below.` : 'A separate evaluation, exact-value checks and persona validation run after generation.'}</p></div></div></div>
  </section>;
}
