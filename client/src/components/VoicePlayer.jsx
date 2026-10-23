import { useId } from 'react';
import { AudioLines, Pause, Play, Square, Volume2 } from 'lucide-react';
import useSpeechPlayer from '../hooks/useSpeechPlayer';
import './VoicePlayer.css';

export default function VoicePlayer({ text, disabled = false, notice = '' }) {
  const id = useId();
  const speech = useSpeechPlayer({ text, disabled });
  const running = ['starting', 'speaking', 'paused'].includes(speech.status);
  const unavailable = !speech.supported || disabled || !text.trim();
  const labels = { idle: 'Ready when you are', starting: 'Starting voice…', speaking: 'Reading aloud', paused: 'Playback paused', complete: 'Finished listening', error: 'Playback unavailable' };
  return <section className={`voice-player ${speech.status === 'speaking' ? 'is-speaking' : ''}`} aria-label="Text to voice player">
    <div className="voice-player-heading"><span className="voice-speaker"><Volume2 size={22} /></span><div><h3>HEAR THE DIFFERENCE.</h3><p>Listen before you send.</p></div><span className="voice-engine-tag">BROWSER VOICE</span></div>
    <div className="voice-player-display"><AudioLines size={21} aria-hidden="true" /><div className="voice-bars" aria-hidden="true">{Array.from({ length: 25 }, (_, i) => <span key={i} style={{ '--bar-height': `${12 + (i * 17 % 35)}px`, '--bar-delay': `${i * -.07}s` }} />)}</div><span className="voice-display-label">{speech.status === 'speaking' ? 'ON AIR' : speech.status === 'paused' ? 'PAUSED' : 'VOICE CHECK'}</span></div>
    <div className="voice-settings"><label htmlFor={`${id}-voice`}>VOICE<select id={`${id}-voice`} disabled={!speech.supported} value={speech.voiceId} onChange={(event) => speech.setVoiceId(event.target.value)}><option value="">System default</option>{speech.voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}{voice.localService ? ' · on device' : ''}</option>)}</select></label><label htmlFor={`${id}-rate`}>SPEED<select id={`${id}-rate`} disabled={!speech.supported} value={speech.rate} onChange={(event) => speech.setRate(Number(event.target.value))}>{[.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label></div>
    <div className="voice-transport"><button className="voice-play" type="button" disabled={unavailable || speech.status === 'starting'} onClick={speech.status === 'speaking' ? speech.pause : speech.play}>{speech.status === 'speaking' ? <Pause size={17} /> : <Play size={17} />}{speech.status === 'speaking' ? 'Pause' : speech.status === 'paused' ? 'Resume' : speech.status === 'complete' ? 'Listen again' : 'Listen'}</button><button type="button" disabled={!running} onClick={speech.stop}><Square size={15} />Stop</button><span role="status">{labels[speech.status]}{speech.segment > 0 && running ? ` · ${speech.segment} / ${speech.total} segments` : ''}</span></div>
    {!speech.supported && <p className="voice-feedback" role="status">This browser doesn’t support text-to-speech. Try a browser with speech playback.</p>}
    {speech.error && <p className="voice-feedback" role="alert">{speech.error}</p>}
    {notice && <p className="voice-notice">{notice}</p>}
    <p className="voice-privacy">Uses voices available in your browser. Some voices use your browser or OS provider’s online service. No VibeShift AI request is made. Changing text or settings stops playback.</p>
  </section>;
}
