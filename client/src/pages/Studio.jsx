import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Columns2, Info, Layers3, LoaderCircle, PenLine, ShieldCheck, Sparkles } from 'lucide-react';
import { personas } from '../personas';
import { samples } from '../samples';
import DraftEditor from '../components/DraftEditor';
import PersonaSelector from '../components/PersonaSelector';
import DeliveryControls from '../components/DeliveryControls';
import RewriteOutput from '../components/OutputPanel';
import BeforeAfterComparison from '../components/BeforeAfterComparison';
import IntelligencePanels, { RewriteEditor } from '../components/IntelligencePanels';
import CopilotPanel from '../components/CopilotPanel';
import SaveRewrite from '../components/SaveRewrite';
import { getPersonaContracts } from '../services/rewrite';

export default function Studio() {
  const { settings, update, clearDraft, loadSample, newDraft, rewrite } = useOutletContext();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [validation, setValidation] = useState('');
  const [notice, setNotice] = useState('');
  const [refinement, setRefinement] = useState('');
  const handledLocation = useRef(null);
  const [contracts, setContracts] = useState([]);
  const [contractError, setContractError] = useState('');
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [view, setView] = useState('write');
  useEffect(() => {
    const controller = new AbortController();
    getPersonaContracts(controller.signal).then(setContracts).catch(() => { if (!controller.signal.aborted) setContractError('Contract definitions unavailable. The server will still enforce the selected persona.'); });
    return () => controller.abort();
  }, []);
  const rewriteBusy = ['loading', 'analyzing'].includes(rewrite.status);
  const busy = rewriteBusy || copilotBusy;
  useEffect(() => {
    if (handledLocation.current === location.key) return;
    handledLocation.current = location.key;
    const requestedTool = params.get('tool');
    setView(['variants', 'misread', 'style'].includes(requestedTool) ? 'copilot' : ['compare', 'intelligence'].includes(params.get('view')) ? params.get('view') : 'write');
    if (params.has('new') || location.state?.newDraft) { setValidation(''); setNotice(''); setRefinement(''); }
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
    rewrite.generate({ ...settings, draft: source, ...((regenerate || refine) && rewrite.result?.settings.styleProfile ? { styleProfile: rewrite.result.settings.styleProfile } : {}) }, refine ? refinement : '');
  }
  const change = (field, value) => { update(field, value); setNotice(''); if (field === 'draft') setValidation(''); };
  const currentPersona = personas.find((persona) => persona.id === settings.persona);
  const outputPersona = personas.find((persona) => persona.id === rewrite.result?.persona);
  const stale = rewrite.result && (rewrite.result.originalText !== settings.draft || Object.keys(settings).some((key) => settings[key] !== rewrite.result.settings[key]));
  return <div className="page studio-page">
    <div className="page-heading"><div><div className="eyebrow">WRITE WITH INTENTION</div><h1>Rewrite Studio</h1><p>Your message, shaped for the person on the other side.</p></div><span className="session-label"><span /> Current draft · In this tab</span></div>
    <nav className="studio-view-nav" aria-label="Studio sections">{[{ id: 'write', label: 'Compose', icon: PenLine }, { id: 'compare', label: 'Compare', icon: Columns2 }, { id: 'intelligence', label: 'Intelligence', icon: ShieldCheck }, { id: 'copilot', label: 'Copilot', icon: Layers3 }].map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'selected' : ''} aria-pressed={view === id} aria-controls={`studio-${id}`} onClick={() => navigate(id === 'write' ? '/studio' : id === 'copilot' ? '/studio?tool=variants' : `/studio?view=${id}`, { replace: true })}><Icon size={16} />{label}{id === 'compare' && rewrite.result && <span>{rewrite.result.diff?.filter((segment) => segment.type !== 'unchanged').length || 0}</span>}</button>)}</nav>
    <div id="studio-write" hidden={view !== 'write'}>
    <div className="studio-layout"><form className="studio-input-column" onSubmit={(event) => { event.preventDefault(); generate(); }}>
      <DraftEditor value={settings.draft} onChange={(value) => change('draft', value)} onClear={() => { const cleared = clearDraft(); if (cleared) { setNotice(''); setValidation(''); setRefinement(''); } return cleared; }} error={validation} />
      <div className="sample-inline"><span>Need a starting point?</span>{samples.map((sample) => <button type="button" key={sample.id} onClick={() => { if (loadSample(sample)) { setValidation(''); setNotice(''); setRefinement(''); } }}>{sample.category}<ArrowUpRight size={12} /></button>)}</div>
      <PersonaSelector contract={contracts.find((contract) => contract.id === settings.persona)} contractError={contractError} value={settings.persona} onChange={(value) => change('persona', value)} />
      <DeliveryControls settings={settings} onChange={change} />
      <div className="generate-section"><button type="submit" disabled={busy} className="button primary generate-button" aria-describedby="generation-note">{busy ? <LoaderCircle size={17} className="loading-spinner" /> : <Sparkles size={17} />}{busy ? 'Writing & checking…' : 'Rewrite message'}<span>{currentPersona?.short}</span></button><p id="generation-note"><Info size={13} /> Includes a separate AI evaluation and at most one targeted repair. Review all findings before sharing.</p>{notice && <p className="rewrite-notice" role="status">{notice}</p>}</div>
    </form><div className="studio-output-column"><RewriteOutput speechEnabled={view === 'write'} result={rewrite.result} status={rewrite.status} error={rewrite.error} personaName={outputPersona?.name} stale={stale} acknowledged={rewrite.acknowledged} onAcknowledge={rewrite.acknowledge} onRefine={() => document.getElementById('refinement')?.focus()} onRegenerate={() => generate({ regenerate: true })} onRestore={(original) => { update('draft', original); setValidation(''); setNotice('Original source restored to the editor. Your rewritten version is still available.'); }} />
    {rewrite.result && <form className="refinement-panel" onSubmit={(event) => { event.preventDefault(); generate({ refine: true }); }}><label htmlFor="refinement">Give this version a little direction</label><p>Refine the same original draft with your current settings.</p><textarea id="refinement" value={refinement} onChange={(event) => setRefinement(event.target.value)} maxLength={500} rows={2} placeholder="e.g. Make the request more diplomatic, and keep it under 50 words." /><div><span>{refinement.length} / 500</span><button className="button secondary" type="submit" disabled={busy || !refinement.trim()}><Sparkles size={14} /> Refine rewrite</button></div></form>}{rewrite.result && <><button className="text-button recheck-button" disabled={busy} onClick={() => rewrite.reanalyze()}>Recheck current rewrite</button><RewriteEditor result={rewrite.result} busy={busy} canUndo={rewrite.canUndo} onApply={(text) => rewrite.reanalyze({ text })} onUndo={rewrite.undo} /></>}</div></div>
    {rewrite.result && <SaveRewrite result={rewrite.result} busy={busy} acknowledged={rewrite.acknowledged} onSaved={rewrite.markSaved} />}
    </div>
    <div id="studio-copilot" hidden={view !== 'copilot'}><CopilotPanel settings={settings} result={rewrite.result} mainBusy={rewriteBusy} onBusyChange={setCopilotBusy} onUseCandidate={(candidate, snapshot) => { rewrite.choose(candidate, snapshot); navigate('/studio', { replace: true }); }} activeTool={params.get('tool')} onToolChange={(tool) => navigate(`/studio?tool=${tool}`, { replace: true })} /></div>
    <div id="studio-compare" hidden={view !== 'compare'}><BeforeAfterComparison originalText={rewrite.result?.originalText || settings.draft} rewrittenText={rewrite.result?.text} segments={rewrite.result?.diff} diffStatus={rewrite.result?.diffStatus} busy={busy} onRestore={(segmentId) => rewrite.reanalyze({ segmentId })} /></div>
    <div id="studio-intelligence" hidden={view !== 'intelligence'}>{rewrite.result ? <IntelligencePanels result={rewrite.result} /> : <div className="intelligence-empty"><ShieldCheck size={28} /><h2>A second look at what matters.</h2><p>Generate a rewrite to inspect meaning preservation, commitments, tone, and persona checks.</p><button className="button secondary" onClick={() => navigate('/studio', { replace: true })}>Back to compose</button></div>}</div>
  </div>;
}
