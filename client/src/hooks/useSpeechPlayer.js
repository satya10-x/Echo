import { useCallback, useEffect, useRef, useState } from 'react';

export function speechSegments(text) {
  const parts = [];
  let rest = text.trim();
  while (rest) {
    let end = Math.min(220, rest.length);
    if (end < rest.length) {
      const breakAt = rest.lastIndexOf(' ', end);
      if (breakAt > 80) end = breakAt;
      // Avoid separating a Unicode surrogate pair at the chunk boundary.
      if (/[\uD800-\uDBFF]/.test(rest[end - 1])) end--;
    }
    parts.push(rest.slice(0, end));
    rest = rest.slice(end).trimStart();
  }
  return parts;
}

export default function useSpeechPlayer({ text, disabled = false }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [voices, setVoices] = useState([]), [voiceId, setVoiceId] = useState(''), [rate, setRate] = useState(1);
  const [status, setStatus] = useState('idle'), [error, setError] = useState(''), [segment, setSegment] = useState(0);
  const active = useRef(null), run = useRef(0), timer = useRef(null), paused = useRef(false);
  const segments = speechSegments(text);
  const stop = useCallback(() => {
    run.current++;
    clearTimeout(timer.current);
    if (active.current && supported) window.speechSynthesis.cancel();
    active.current = null; paused.current = false;
    setStatus('idle'); setSegment(0);
  }, [supported]);
  useEffect(() => {
    if (!supported) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices().slice().sort((a, b) => Number(b.localService) - Number(a.localService) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)));
    refresh();
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, [supported]);
  useEffect(() => { stop(); setError(''); }, [text, voiceId, rate, disabled, stop]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      run.current++; clearTimeout(timer.current);
      if (active.current && supported) window.speechSynthesis.cancel();
      active.current = null;
    };
  }, [stop, supported]);
  function play() {
    if (!supported || disabled || !segments.length) return;
    if (paused.current && active.current) {
      paused.current = false; window.speechSynthesis.resume(); setStatus('speaking'); return;
    }
    stop(); setError(''); setStatus('starting');
    const id = run.current;
    const synth = window.speechSynthesis;
    // Some browsers retain the global paused flag after cancelling a prior note.
    synth.resume();
    const chosen = voices.find((voice) => voice.voiceURI === voiceId);
    function speak(index) {
      if (run.current !== id) return;
      const utterance = new SpeechSynthesisUtterance(segments[index]);
      active.current = utterance;
      if (chosen) { utterance.voice = chosen; utterance.lang = chosen.lang; }
      else utterance.lang = document.documentElement.lang || 'en';
      utterance.rate = rate;
      setSegment(index + 1);
      utterance.onstart = () => { if (id === run.current) { clearTimeout(timer.current); setStatus(paused.current ? 'paused' : 'speaking'); } };
      utterance.onend = () => {
        if (id !== run.current) return;
        clearTimeout(timer.current);
        if (index + 1 < segments.length) speak(index + 1);
        else { active.current = null; paused.current = false; setStatus('complete'); }
      };
      utterance.onerror = (event) => {
        if (id !== run.current) return;
        stop(); setStatus('error');
        setError(event.error === 'not-allowed' ? 'Playback was blocked. Press Listen again or allow audio in this browser.' : 'This voice could not play. Try System default or another voice.');
      };
      timer.current = setTimeout(() => {
        if (id !== run.current) return;
        stop(); setStatus('error'); setError('The voice did not start. Try another voice or open the page in your regular browser.');
      }, 12000);
      try { synth.speak(utterance); }
      catch { stop(); setStatus('error'); setError('Speech playback is unavailable in this browser.'); }
    }
    speak(0);
  }
  function pause() {
    if (!active.current || status !== 'speaking') return;
    paused.current = true; window.speechSynthesis.pause(); setStatus('paused');
  }
  return { supported, voices, voiceId, setVoiceId, rate, setRate, status, error, segment, total: segments.length, play, pause, stop };
}
