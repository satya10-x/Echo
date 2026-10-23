import { useState } from 'react';
import { Clock3, Copy, Info, RotateCcw, ShieldCheck, Sparkles, Undo2 } from 'lucide-react';
import { countWords } from '../hooks/useDraftWorkspace';
import { EmptyState, LoadingState } from './FeedbackState';

// A real result will supply { text, originalText }; no sample output is generated.
export default function RewriteOutput({ result = null, status = 'idle', error = '', onRegenerate, onRestore }) {
  const [copyStatus, setCopyStatus] = useState('');
  const hasOutput = Boolean(result?.text);
  const busy = status === 'loading';
  async function copy() {
    try {
      await navigator.clipboard.writeText(result.text);
      setCopyStatus('Copied to clipboard.');
    } catch {
      setCopyStatus('Copy wasn’t available. Select the message and copy it manually.');
    }
  }
  return <section className="editor-panel output-panel" aria-labelledby="output-title" aria-busy={busy}>
    <div className="panel-heading"><h2 id="output-title"><Sparkles size={17} /> Rewritten message</h2><span className="small-badge">{busy ? 'WORKING' : hasOutput ? 'OUTPUT' : 'READY WHEN YOU ARE'}</span></div>
    {busy ? <LoadingState /> : status === 'error' ? <div className="output-error" role="alert"><Info size={24} /><h3>We couldn’t complete that rewrite.</h3><p>{error || 'Your original draft is still here. Please try again when the connection is available.'}</p></div> : hasOutput ? <div className="rewritten-text" tabIndex={0}>{result.text}</div> : <EmptyState title="The right words are worth a little care."><p>Your rewritten message will appear here. Start with a draft and choose how you want it to land.</p><span className="coming-pill">AI integration coming next</span></EmptyState>}
    <div className="output-word-count">{hasOutput ? `${countWords(result.text)} words · ${result.text.length.toLocaleString()} characters` : 'No rewritten output yet'}</div>
    <div className="output-actions"><button className="button secondary" disabled={!hasOutput || busy || !onRegenerate} onClick={onRegenerate} title="Regeneration requires the upcoming AI integration"><RotateCcw size={14} /> Regenerate</button><button className="button secondary" disabled={!hasOutput || busy || !result.originalText || !onRestore} onClick={() => onRestore(result.originalText)} title="Restore the source draft used for this rewrite"><Undo2 size={14} /> Restore original</button><button className="button secondary" disabled={!hasOutput || busy} onClick={copy}><Copy size={14} /> Copy</button></div>
    <p className="copy-status" role="status">{copyStatus}</p>
    {!hasOutput && <p className="output-availability">Copy and restore become available when a real rewrite exists.</p>}
    <div className="output-insights"><div><span className="insight-icon"><Info size={17} /></span><div><h3>What changed and why?</h3><p>Explanations will appear alongside real rewrites.</p></div><span className="small-badge">NEXT</span></div><div><span className="insight-icon"><ShieldCheck size={17} /></span><div><h3>Your meaning, protected</h3><p>Fidelity and commitment checks are not connected yet.</p></div><Clock3 size={15} className="insight-placeholder" aria-label="Checks coming later" /></div></div>
  </section>;
}
