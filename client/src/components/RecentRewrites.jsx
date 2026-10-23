import { useEffect, useState } from 'react';
import { ArrowRight, FileText, FolderOpen, LoaderCircle } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { getHistory, hasHistorySession, listHistory } from '../services/history';
import { apiMessage } from '../services/copilot';
export default function RecentRewrites() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState('');
  const [error, setError] = useState('');
  const { loadSaved } = useOutletContext();
  const navigate = useNavigate();
  useEffect(() => {
    let mounted = true;
    if (!hasHistorySession()) return;
    setLoading(true);
    listHistory().then(({ records }) => { if (mounted) setRecords(records.slice(0, 3)); }).catch((failure) => { if (mounted) setError(apiMessage(failure)); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  async function open(record) {
    if (opening) return;
    setOpening(record.id); setError('');
    try { const saved = await getHistory(record.id); if (loadSaved(saved)) navigate('/studio'); }
    catch (failure) { setError(apiMessage(failure)); }
    finally { setOpening(''); }
  }
  return <section className="recent-section saved-recent-section" aria-labelledby="saved-recent-heading"><div className="section-heading"><div><h2 id="saved-recent-heading">Recent rewrites</h2><p>The versions you chose to keep.</p></div><Link className="text-button" to="/history">View all history <ArrowRight size={14} /></Link></div><div className="recent-list">{loading ? <p className="recent-loading" role="status"><LoaderCircle size={17} className="loading-spinner" /> Loading your saved rewrites…</p> : records.length ? records.map((record) => <button className="recent-row" key={record.id} disabled={Boolean(opening)} onClick={() => open(record)}><span className="recent-row-icon"><FileText size={18} /></span><span className="recent-row-copy"><strong>{record.title}</strong><span>{record.persona} <span>·</span> {new Date(record.updatedAt).toLocaleDateString()}</span></span>{opening === record.id ? <LoaderCircle size={16} className="loading-spinner" /> : <ArrowRight size={16} />}</button>) : !error && <div className="recent-empty"><FolderOpen size={24} /><div><h3>No saved rewrites yet.</h3><p>Save an accepted version in the Studio to find it here.</p></div><Link className="text-button" to="/studio">Start writing <ArrowRight size={14} /></Link></div>}{error && <p className="feature-error" role="alert">{error}</p>}</div></section>;
}
