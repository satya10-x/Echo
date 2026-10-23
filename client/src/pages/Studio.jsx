import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Info, Sparkles } from 'lucide-react';
import { personas } from '../personas';
import { samples } from '../samples';
import DraftEditor from '../components/DraftEditor';
import PersonaSelector from '../components/PersonaSelector';
import DeliveryControls from '../components/DeliveryControls';
import RewriteOutput from '../components/OutputPanel';
import BeforeAfterComparison from '../components/BeforeAfterComparison';

export default function Studio() {
  const { settings, update, clearDraft, loadSample, newDraft } = useOutletContext();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [validation, setValidation] = useState('');
  const [notice, setNotice] = useState('');
  const handledLocation = useRef(null);
  // Retain Prompt 1 persona links and new-draft URLs without resetting on edits.
  useEffect(() => {
    if (handledLocation.current === location.key) return;
    handledLocation.current = location.key;
    setValidation('');
    setNotice('');
    const requested = params.get('persona');
    if (personas.some((item) => item.id === requested)) update('persona', requested);
    if (params.has('new')) { newDraft(); navigate('/studio', { replace: true }); }
  }, [location.key, params, update, newDraft, navigate]);
  function prepareRewrite(event) {
    event.preventDefault();
    if (!settings.draft.trim()) {
      setValidation('Add a few words first — a rough thought or bullet points are a great start.');
      setNotice('');
      document.getElementById('draft')?.focus();
      return;
    }
    setValidation('');
    setNotice('Your draft and preferences are ready. AI integration is coming next; no rewrite has been generated.');
  }
  const change = (field, value) => { update(field, value); setNotice(''); if (field === 'draft') setValidation(''); };
  return <div className="page studio-page">
    <div className="page-heading"><div><div className="eyebrow">YOUR MESSAGE. A NEW PERSPECTIVE.</div><h1>Rewrite Studio<span className="heading-dot">.</span></h1><p>Keep what you mean. Shape how it lands.</p></div><span className="session-label"><span /> In this tab only · Not saved</span></div>
    <div className="studio-layout"><form className="studio-input-column" onSubmit={prepareRewrite}>
      <DraftEditor value={settings.draft} onChange={(value) => change('draft', value)} onClear={() => { const cleared = clearDraft(); if (cleared) { setNotice(''); setValidation(''); } return cleared; }} error={validation} />
      <div className="sample-inline"><span>Need a starting point?</span>{samples.map((sample) => <button type="button" key={sample.id} onClick={() => { if (loadSample(sample)) { setValidation(''); setNotice(''); } }}>{sample.category}<ArrowUpRight size={12} /></button>)}</div>
      <PersonaSelector value={settings.persona} onChange={(value) => change('persona', value)} />
      <DeliveryControls settings={settings} onChange={change} />
      <div className="generate-section"><button type="submit" className="button primary generate-button" aria-describedby="generation-note"><Sparkles size={17} /> Rewrite message <span>AI integration coming next</span></button><p id="generation-note"><Info size={13} /> Prepare your draft now. No AI requests are sent in this preview.</p>{notice && <p className="rewrite-notice" role="status">{notice}</p>}</div>
    </form><RewriteOutput /></div>
    <BeforeAfterComparison originalText={settings.draft} />
  </div>;
}
