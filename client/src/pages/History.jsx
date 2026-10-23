import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Bookmark, LoaderCircle, Pencil, Search, Trash2 } from 'lucide-react';
import { listHistory, getHistory, renameHistory, removeHistory, forgetHistorySession } from '../services/history';
import { apiMessage } from '../services/copilot';

export default function History() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [invalidSession, setInvalidSession] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState({});
  const requestId = useRef(0);
  const { loadSaved } = useOutletContext();
  const navigate = useNavigate();
  async function refresh(search = '') {
    const id = ++requestId.current;
    setLoading(true); setError(''); setInvalidSession(false);
    try { const data = await listHistory(search); if (id === requestId.current) setRecords(data.records); }
    catch (failure) { if (id === requestId.current) { setError(apiMessage(failure)); setInvalidSession(failure.response?.data?.code === 'SESSION_INVALID'); } }
    finally { if (id === requestId.current) setLoading(false); }
  }
  useEffect(() => { refresh(); return () => { requestId.current++; }; }, []);
  async function action(record, type) {
    if (working) return;
    if (type === 'delete' && !window.confirm(`Delete “${record.title}” and all its saved versions? This cannot be undone.`)) return;
    const title = type === 'rename' ? window.prompt('Rename saved draft', record.title) : null;
    if (type === 'rename' && (title === null || !title.trim())) return;
    setWorking(record.id); setError('');
    try {
      if (type === 'open') {
        const saved = await getHistory(record.id, selectedVersions[record.id]);
        if (loadSaved(saved)) navigate('/studio');
      } else {
        if (type === 'delete') await removeHistory(record.id);
        else await renameHistory(record, title.trim());
        await refresh(query);
      }
    } catch (failure) { setError(apiMessage(failure)); }
    finally { setWorking(''); }
  }
  return <div className="page history-page"><div className="page-heading"><div><div className="eyebrow">ACCEPTED WORDS, READY TO REVISIT</div><h1>Your rewrite history.</h1><p>Only the versions you chose to save. No automatic draft logging.</p></div><Bookmark size={25} className="history-heading-icon" /></div><div className="privacy-note"><strong>Private to this anonymous browser session.</strong><p>This browser stores a server-issued access token. Clearing browser storage loses access, but does not delete saved records. Delete confidential records here when you no longer need them. This is not a cross-device account.</p></div><form className="history-search" onSubmit={(event) => { event.preventDefault(); refresh(query); }}><Search size={17} /><label className="sr-only" htmlFor="history-search">Search saved history</label><input id="history-search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} placeholder="Search titles or saved text" /><button className="button secondary" disabled={loading}>Search</button></form>{error && <div className="feature-error" role="alert"><p>{error}</p><button className="text-button" onClick={() => refresh(query)}>Try again</button>{invalidSession && <button className="text-button" onClick={() => { if (window.confirm('Start a new anonymous session? Existing history will not transfer, and this action does not delete old records.')) { forgetHistorySession(); refresh(); } }}>Start a new anonymous session</button>}</div>}{loading ? <div className="feature-empty" role="status"><LoaderCircle className="loading-spinner" /><p>Loading your saved rewrites…</p></div> : !records.length && !error ? <div className="feature-empty"><Bookmark size={30} /><h2>{query ? 'No matching saved rewrites.' : 'A home for the versions you keep.'}</h2><p>{query ? 'Try a different title or phrase.' : 'Accept and save a rewrite from the Studio to see it here.'}</p><button className="button primary" onClick={() => navigate('/studio')}>Open Rewrite Studio <ArrowRight size={15} /></button></div> : <div className="history-records">{records.map((record) => <article key={record.id} className="history-record"><div className="history-record-heading"><div><span className="small-badge">{record.persona} · {record.versions.length} saved {record.versions.length === 1 ? 'version' : 'versions'}</span><h2>{record.title}</h2><p>Updated {new Date(record.updatedAt).toLocaleString()}</p></div><div className="history-record-actions"><button className="icon-button" disabled={Boolean(working)} aria-label={`Rename ${record.title}`} onClick={() => action(record, 'rename')}><Pencil size={16} /></button><button className="icon-button" disabled={Boolean(working)} aria-label={`Delete ${record.title}`} onClick={() => action(record, 'delete')}><Trash2 size={16} /></button></div></div><p className="history-preview">{record.preview}</p><div className="history-record-bottom"><label>Version<select value={selectedVersions[record.id] || record.versions.at(-1)?.number} onChange={(event) => setSelectedVersions({ ...selectedVersions, [record.id]: Number(event.target.value) })}>{[...record.versions].reverse().map((version) => <option key={version.number} value={version.number}>Version {version.number} · {new Date(version.createdAt).toLocaleDateString()}</option>)}</select></label><button className="button secondary" disabled={Boolean(working)} onClick={() => action(record, 'open')}>{working === record.id ? <LoaderCircle size={14} className="loading-spinner" /> : <ArrowRight size={14} />} Open in Studio</button></div><small>Saved metadata is a snapshot. Recheck after opening for fresh semantic analysis.</small></article>)}</div>}</div>;
}
