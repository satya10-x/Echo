import { useId, useState } from 'react';
import VoicePlayer from './VoicePlayer';

export default function VoiceComposer() {
  const id = useId();
  const [text, setText] = useState('A little shift. A clearer message. Hear how your words sound before you share them.');
  return <div className="voice-composer"><div className="voice-input"><div className="voice-input-heading"><label htmlFor={id}>GIVE YOUR WORDS A VOICE.</label><span>{text.length.toLocaleString()} / 5,000</span></div><textarea id={id} value={text} onChange={(event) => setText(event.target.value)} rows={7} maxLength={5000} placeholder="Paste a message, a note, or something you want to hear aloud." /><p>Paste your text, pick a voice, and press Listen. Language support depends on the voices installed in your browser.</p></div><VoicePlayer text={text} /></div>;
}
