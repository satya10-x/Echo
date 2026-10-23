import { useEffect, useRef, useState } from 'react';
import { requestRewrite } from '../services/rewrite';

export default function useRewrite() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const active = useRef(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  function reset() {
    active.current?.abort();
    active.current = null;
    setResult(null); setStatus('idle'); setError('');
  }
  async function generate(settings, refinement = '') {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const snapshot = { ...settings };
    setStatus('loading'); setError('');
    try {
      const response = await requestRewrite(snapshot, refinement, controller.signal);
      if (active.current !== controller) return;
      setResult({ ...response, text: response.rewrittenText, originalText: snapshot.draft, settings: snapshot, refinement, generatedAt: Date.now() });
      setStatus('success');
    } catch (failure) {
      if (active.current !== controller || controller.signal.aborted) return;
      const serverMessage = failure.response?.data?.error;
      setError(typeof serverMessage === 'string' ? serverMessage : failure.code === 'ECONNABORTED'
        ? 'The rewrite timed out. Your draft is safe; try again.'
        : failure.response ? 'The rewrite service could not complete this request. Please try again.'
        : 'Could not reach the rewrite service. Make sure the server is running and try again.');
      setStatus('error');
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  return { result, status, error, generate, reset };
}
