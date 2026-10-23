import { useEffect, useState } from 'react';
import { BookmarkPlus, LoaderCircle } from 'lucide-react';
import { saveHistory } from '../services/history';
import { apiMessage } from '../services/copilot';
import { needsReview } from './IntelligencePanels';
export default function SaveRewrite({ result, busy, acknowledged, onSaved }) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setTitle(result.historyTitle || result.originalText.split('\n')[0].slice(0, 80)); setMessage(''); setError(''); }, [result.revision]);
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setMessage(''); setError('');
    try { const record = await saveHistory(result, title); onSaved(record, result.revision); setMessage('Accepted rewrite saved to this browser’s anonymous history.'); }
    catch (failure) { setError(apiMessage(failure)); }
    finally { setSaving(false); }
  }
  return <form className="save-rewrite" onSubmit={save}><label htmlFor="save-title"><BookmarkPlus size={16} /> Save an accepted version</label><p>Stored in MongoDB only when you save. This browser’s anonymous access token controls your history.</p><div><input id="save-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Give this draft a title" required /><button className="button secondary" disabled={busy || saving || !title.trim() || (needsReview(result) && !acknowledged)}>{saving ? <LoaderCircle size={14} className="loading-spinner" /> : <BookmarkPlus size={14} />}{result.historyRecordId ? 'Save new version' : 'Save rewrite'}</button></div>{needsReview(result) && !acknowledged && <small>Acknowledge the visible review warnings before saving an accepted version.</small>}{message && <p className="feature-success" role="status">{message}</p>}{error && <p className="feature-error" role="alert">{error}</p>}</form>;
}
