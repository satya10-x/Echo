import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Info, LoaderCircle, Sparkles } from 'lucide-react';
import { personas } from '../personas';
import { samples } from '../samples';
import DraftEditor from '../components/DraftEditor';
import PersonaSelector from '../components/PersonaSelector';
import DeliveryControls from '../components/DeliveryControls';
import RewriteOutput from '../components/OutputPanel';
import BeforeAfterComparison from '../components/BeforeAfterComparison';

export default function Studio() {
  const { settings, update, clearDraft, loadSample, newDraft, rewrite } = useOutletContext();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [validation, setValidation] = useState('');
  const [notice, setNotice] = useState('');
  const [refinement, setRefinement] = useState('');
  const handledLocation = useRef(null);
  const busy = rewrite.status === 'loading';
  useEffect(() => {
    if (handledLocation.current === location.key) return;
    handledLocation.current = location.key;
    setValidation(''); setNotice(''); setRefinement('');
    const requested = params.get('persona') === 'peer' ? 'supportive' : params.get('persona');
    if (personas.some((item) => item.id === requested)) update('persona', requested);
    if (params.has('new')) { newDraft(); navigate('/studio', { replace: true }); }
  }, [location.key, params, update, newDraft, navigate]);
  function generate({ refine = false, regenerate = false } = {}) {
    if (busy) return;
    const source = regenerate || refine ? rewrite.result?.originalText : settings.draft;
    if (!source?.trim()) {
      setValidation('Add a few words first — a rough thought or bullet points are a great start.');
      document.getElementById('draft')?.focus();
      return;
    }
    if (refine && !refinement.trim()) return;
    setValidation(''); setNotice('');
    // Regenerate/refine the same source with current controls; never rewrite output as if it were the source.
    rewrite.generate({ ...settings, draft: source }, refine ? refinement : '');
  }
  const change = (field, value) => { update(field, value); setNotice(''); if (field === 'draft') setValidation(''); };
  const currentPersona = personas.find((persona) => persona.id === settings.persona);
  const outputPersona = personas.find((persona) => persona.id === rewrite.result?.persona);
  const stale = rewrite.result && (rewrite.result.originalText !== settings.draft || Object.keys(settings).some((key) => settings[key] !== rewrite.result.settings[key]));
  return <div className="page studio-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR MESSAGE. A NEW PERSPECTIVE.</div><h1>Rewrite Studio<span className="heading-dot">.</span></h1><p>Keep what you mean. Shape how it lands.</p></div><span className="session-label"><span /> In this tab only · Not saved</span></div>
    <div className="studio-layout"><form className="studio-input-column" onSubmit={(event) => { event.preventDefault(); generate(); }}>
      <DraftEditor value={settings.draft} onChange={(value) => change('draft', value)} onClear={() => { const cleared = clearDraft(); if (cleared) { setNotice(''); setValidation(''); setRefinement(''); } return cleared; }} error={validation} />
      <div className="sample-inline"><span>Need a starting point?</span>{samples.map((sample) => <button type="button" key={sample.id} onClick={() => { if (loadSample(sample)) { setValidation(''); setNotice(''); setRefinement(''); } }}>{sample.category}<ArrowUpRight size={12} /></button>)}</div>
      <PersonaSelector value={settings.persona} onChange={(value) => change('persona', value)} />
      <DeliveryControls settings={settings} onChange={change} />
      <div className="generate-section"><button type="submit" disabled={busy} className="button primary generate-button" aria-describedby="generation-note">{busy ? <LoaderCircle size={17} className="loading-spinner" /> : <Sparkles size={17} />}{busy ? 'Rewriting your message…' : 'Rewrite message'}<span>{currentPersona?.short}</span></button><p id="generation-note"><Info size={13} /> Your draft is sent to the configured AI provider. Review the result before sharing.</p>{notice && <p className="rewrite-notice" role="status">{notice}</p>}</div>
    </form><div className="studio-output-column"><RewriteOutput result={rewrite.result} status={rewrite.status} error={rewrite.error} personaName={outputPersona?.name} stale={stale} onRegenerate={() => generate({ regenerate: true })} onRestore={(original) => { update('draft', original); setValidation(''); setNotice('Original source restored to the editor. Your rewritten version is still available.'); }} />
    {rewrite.result && <form className="refinement-panel" onSubmit={(event) => { event.preventDefault(); generate({ refine: true }); }}><label htmlFor="refinement">Give this version a little direction</label><p>Refine the same original draft with your current settings.</p><textarea id="refinement" value={refinement} onChange={(event) => setRefinement(event.target.value)} maxLength={500} rows={2} placeholder="e.g. Make the request more diplomatic, and keep it under 50 words." /><div><span>{refinement.length} / 500</span><button className="button secondary" type="submit" disabled={busy || !refinement.trim()}><Sparkles size={14} /> Refine rewrite</button></div></form>}</div></div>
    <BeforeAfterComparison originalText={rewrite.result?.originalText || settings.draft} rewrittenText={rewrite.result?.text} />
  </div>;
}
