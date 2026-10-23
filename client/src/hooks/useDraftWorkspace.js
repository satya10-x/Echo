import { useState } from 'react';
import useRewrite from './useRewrite';

const initial = () => ({ draft: '', persona: 'executive', tone: 'Professional', length: 'Balanced', purpose: 'Inform', audience: '' });
export function countWords(text = '') {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
export default function useDraftWorkspace() {
  const [settings, setSettings] = useState(initial);
  const rewrite = useRewrite();
  const update = (field, value) => setSettings((previous) => ({ ...previous, [field]: value }));
  const confirmReplace = () => !settings.draft || window.confirm('Replace your current draft? It is only kept in this tab and cannot be recovered.');
  const newDraft = () => {
    if (!confirmReplace()) return false;
    rewrite.reset();
    setSettings(initial());
    return true;
  };
  const loadSample = (sample) => {
    if (!confirmReplace()) return false;
    rewrite.reset();
    setSettings({ ...initial(), draft: sample.text, persona: sample.persona });
    return true;
  };
  const clearDraft = () => {
    if (!settings.draft || !window.confirm('Clear this draft? This cannot be undone.')) return false;
    rewrite.reset();
    update('draft', '');
    return true;
  };
  return { settings, update, newDraft, loadSample, clearDraft, rewrite };
}
