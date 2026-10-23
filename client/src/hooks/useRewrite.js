import { useEffect, useRef, useState } from 'react';
import { requestRewrite, requestAnalysis } from '../services/rewrite';

export default function useRewrite() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const history = useRef([]);
  const active = useRef(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  function reset() {
    active.current?.abort(); active.current = null;
    history.current = [];
    setCanUndo(false); setAcknowledged(false); setResult(null); setStatus('idle'); setError('');
  }
  async function execute(operation, phase) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setStatus(phase); setError('');
    try {
      await operation(controller);
    } catch (failure) {
      if (active.current !== controller || controller.signal.aborted) return;
      const serverMessage = failure.response?.data?.error;
      setError(typeof serverMessage === 'string' ? serverMessage : failure.code === 'ECONNABORTED'
        ? 'The request timed out. Your previous text is safe; try again.'
        : failure.response ? 'The service could not complete this request. Please try again.'
        : 'Could not reach the service. Make sure the server is running and try again.');
      setStatus('error');
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  async function generate(settings, refinement = '') {
    const snapshot = { ...settings };
    return execute(async (controller) => {
      const response = await requestRewrite(snapshot, refinement, controller.signal);
      if (active.current !== controller) return;
      history.current = []; setCanUndo(false); setAcknowledged(false);
      setResult({ ...response, text: response.rewrittenText, originalText: response.originalText || snapshot.draft.trim(), settings: snapshot, refinement, generatedAt: Date.now() });
      setStatus('success');
    }, 'loading');
  }
  async function reanalyze({ text, segmentId } = {}) {
    if (!result) return;
    const previous = result;
    return execute(async (controller) => {
      const response = await requestAnalysis(previous, { text, segmentId }, controller.signal);
      if (active.current !== controller) return;
      history.current = [...history.current.slice(-9), previous];
      setCanUndo(true); setAcknowledged(false);
      setResult({ ...previous, ...response, text: response.rewrittenText, edited: true, summary: 'This rewrite was edited. The comparison and checks have been recomputed.', changeReasons: [] });
      setStatus('success');
    }, 'analyzing');
  }
  function choose(candidate, settings) {
    if (active.current) return;
    history.current = [];
    setCanUndo(false); setAcknowledged(false); setError(''); setStatus('success');
    setResult({ ...candidate, text: candidate.rewrittenText, originalText: candidate.originalText || settings.draft.trim(), settings: { ...settings }, refinement: settings.refinement || '', generatedAt: Date.now() });
  }
  function markSaved(record, revision) {
    setResult((current) => current?.revision === revision ? { ...current, historyRecordId: record.id, historyRecordRevision: record.revision, historyTitle: record.title } : current);
  }
  function undo() {
    if (active.current || !history.current.length) return;
    setResult(history.current.pop()); setCanUndo(history.current.length > 0); setAcknowledged(false); setStatus('success'); setError('');
  }
  return { result, status, error, generate, reset, reanalyze, undo, choose, markSaved, canUndo, acknowledged, acknowledge: () => setAcknowledged(true) };
}
