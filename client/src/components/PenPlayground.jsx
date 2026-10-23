import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import glyphs from '../assets/ems-allure.json';
import './PenPlayground.css';

const inks = { Black: '#171713', Blue: '#3158ad', Plum: '#81395c' };
const defaultNote = 'Same intention.\nA better way to say it.\nMake the message yours.';
const printable = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x20-\x7e\n]/g, '');

function layoutNote(text) {
  // Lay out actual single-line glyph strokes, rather than revealing a text mask.
  for (const size of [34, 30, 26, 22, 18, 16, 14, 12]) {
    const scale = size / 1000;
    let x = 72, y = 145;
    const strokes = [];
    const content = text.split('\n').length > 6 ? text.replaceAll('\n', ' ') : text;
    const tokens = content.split(/(\s+)/);
    for (const token of tokens) {
      const width = [...token].reduce((sum, char) => sum + (glyphs[char]?.advance || 0) * scale, 0);
      if (!/^\s+$/.test(token) && x > 72 && x + width > 483) { x = 72; y += size * 1.6; }
      for (const char of token) {
        if (char === '\n') { x = 72; y += size * 1.6; continue; }
        const glyph = glyphs[char];
        if (!glyph) continue;
        if (x + glyph.advance * scale > 483) { x = 72; y += size * 1.6; }
        for (const points of glyph.strokes) {
          const pts = points.map(([px, py]) => [x + px * scale, y - py * scale]);
          const distances = [0];
          for (let i = 1; i < pts.length; i++) distances.push(distances[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
          if (distances.at(-1) > 0) strokes.push({ pts, distances, length: distances.at(-1), d: pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ') });
        }
        x += glyph.advance * scale;
      }
    }
    if (y <= 343 || size === 12) {
      let end = 0;
      return strokes.map((stroke) => { const start = end; end += stroke.length + 9; return { ...stroke, start, end }; });
    }
  }
  return [];
}
function pointAlong(stroke, distance) {
  let i = stroke.distances.findIndex((value) => value >= distance);
  if (i <= 0) return stroke.pts[i === 0 ? 0 : stroke.pts.length - 1];
  const ratio = (distance - stroke.distances[i - 1]) / (stroke.distances[i] - stroke.distances[i - 1]);
  return stroke.pts[i].map((value, axis) => stroke.pts[i - 1][axis] + (value - stroke.pts[i - 1][axis]) * ratio);
}
function armAt(x, y) {
  const base = [540, 24], length = 300;
  const dx = x - base[0], dy = y - base[1];
  const distance = Math.min(599.9, Math.max(.1, Math.hypot(dx, dy)));
  const angle = Math.atan2(dy, dx) - Math.acos(distance / (2 * length));
  return { base, elbow: [base[0] + length * Math.cos(angle), base[1] + length * Math.sin(angle)], tip: [x, y] };
}

function PenWriter({ text, ink, speed, paused, replay, onComplete }) {
  const strokes = useMemo(() => layoutNote(printable(text)), [text]);
  const paths = useRef([]), upper = useRef(null), lower = useRef(null), upperFace = useRef(null), lowerFace = useRef(null), joint = useRef(null), nib = useRef(null), stage = useRef(null);
  const progress = useRef(0), previous = useRef([]), epoch = useRef(replay);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(stage.current);
    return () => { media.removeEventListener('change', update); observer.disconnect(); };
  }, []);
  useEffect(() => {
    let shared = 0;
    while (shared < strokes.length && shared < previous.current.length && strokes[shared].d === previous.current[shared].d) shared++;
    progress.current = epoch.current !== replay ? 0 : Math.min(progress.current, shared ? strokes[shared - 1].end : 0);
    previous.current = strokes; epoch.current = replay;
    const total = strokes.at(-1)?.end || 0;
    function paint(distance) {
      let tip = [94, 115];
      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i];
        const along = Math.min(stroke.length, Math.max(0, distance - stroke.start - 9));
        if (paths.current[i]) paths.current[i].style.strokeDashoffset = String(1 - along / stroke.length);
        if (distance >= stroke.start && distance <= stroke.end) {
          if (distance < stroke.start + 9) {
            const from = i ? strokes[i - 1].pts.at(-1) : [94, 115];
            const fraction = (distance - stroke.start) / 9;
            tip = from.map((value, axis) => value + (stroke.pts[0][axis] - value) * fraction);
          } else tip = pointAlong(stroke, along);
        } else if (distance >= total && strokes.length) tip = strokes.at(-1).pts.at(-1);
      }
      const { base, elbow } = armAt(...tip);
      upper.current?.setAttribute('d', `M${base} L${elbow}`);
      lower.current?.setAttribute('d', `M${elbow} L${tip}`);
      upperFace.current?.setAttribute('d', `M${base} L${elbow}`);
      lowerFace.current?.setAttribute('d', `M${elbow} L${tip}`);
      joint.current?.setAttribute('transform', `translate(${elbow})`);
      nib.current?.setAttribute('transform', `translate(${tip})`);
    }
    if (reduced) { progress.current = total; paint(total); onComplete(true); return; }
    paint(progress.current);
    if (progress.current >= total) { onComplete(true); return; }
    onComplete(false);
    if (paused || !visible) return;
    let frame, last;
    function tick(now) {
      if (last !== undefined) progress.current = Math.min(total, progress.current + Math.min(50, now - last) * speed / 1000);
      last = now;
      paint(progress.current);
      if (progress.current < total) frame = requestAnimationFrame(tick);
      else onComplete(true);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [strokes, replay, speed, paused, visible, reduced, onComplete]);
  return <svg ref={stage} className="pen-stage" viewBox="0 0 580 410" role="img" aria-label={`Pen drawing your note: ${text || 'Empty note'}`}>
    <rect x="39" y="76" width="484" height="304" fill="#171713" />
    <rect x="32" y="69" width="484" height="304" fill="#fffef9" stroke="#171713" strokeWidth="2" />
    <path d="M60 101H488 M60 347H488" stroke="#c3c1b6" strokeWidth="1" />
    <text x="72" y="94" className="pen-paper-label">VIBESHIFT / A NOTE IN YOUR OWN WORDS</text>
    <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{strokes.map((stroke, i) => <path key={i} ref={(element) => { paths.current[i] = element; }} d={stroke.d} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />)}</g>
    <g aria-hidden="true" className={reduced ? 'pen-arm pen-arm-static' : 'pen-arm'} fill="none" strokeLinecap="round">
      <path ref={upper} stroke="#171713" strokeWidth="20" /><path ref={upperFace} stroke="#fffef9" strokeWidth="14" /><path ref={lower} stroke="#171713" strokeWidth="15" /><path ref={lowerFace} stroke="#fffef9" strokeWidth="9" />
      <circle cx="540" cy="24" r="16" fill="#f77746" stroke="#171713" strokeWidth="2" />
      <circle cx="540" cy="24" r="5" fill="#171713" />
      <g ref={joint}><circle r="12" fill="#d6f760" stroke="#171713" strokeWidth="2" /><circle r="4" fill="#171713" /></g>
      <g ref={nib}><path d="M0 0L9 -26L20 -20Z" fill={ink} stroke="#171713" strokeWidth="1.5" /><path d="M0 0L6 -7" stroke={ink} strokeWidth="2" /><circle cx="15" cy="-22" r="5" fill="#f77746" stroke="#171713" strokeWidth="1.5" /></g>
    </g>
  </svg>;
}

export default function PenPlayground() {
  const [text, setText] = useState(defaultNote), [ink, setInk] = useState('Black'), [speed, setSpeed] = useState(190);
  const [paused, setPaused] = useState(false), [replay, setReplay] = useState(0), [done, setDone] = useState(false);
  return <section className="pen-playground lp-section" id="pen-demo" aria-labelledby="pen-title">
    <div className="pen-section-heading"><div><span className="lp-section-index">YOUR WORDS, ONE STROKE AT A TIME</span><h2 id="pen-title">LESS TYPING ENERGY.<br /><span>MORE PEN ENERGY.</span></h2></div><p>A little room to play. Type a note and watch the pen trace every letter. This is a local handwriting preview, separate from AI rewriting.</p></div>
    <div className="pen-playground-grid"><div className="pen-composer"><label htmlFor="pen-note">YOUR NOTE <span>{text.length} / 180</span></label><textarea id="pen-note" rows={5} maxLength={180} value={text} onChange={(event) => setText(event.target.value)} aria-describedby="pen-note-help" /><p id="pen-note-help">Latin letters, numbers and punctuation. Accents are simplified; other scripts and emoji aren’t drawn. Long notes reflow to fit the card.</p>
      <fieldset className="pen-inks"><legend>PICK YOUR INK</legend>{Object.entries(inks).map(([name, color]) => <button type="button" key={name} aria-pressed={ink === name} className={ink === name ? 'selected' : ''} onClick={() => setInk(name)}><span style={{ background: color }} />{name}</button>)}</fieldset>
      <label className="pen-speed" htmlFor="pen-speed">PEN PACE<select id="pen-speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={100}>Unhurried</option><option value={190}>Steady</option><option value={340}>Brisk</option></select></label>
      <div className="pen-controls"><button type="button" disabled={done || !printable(text).trim()} onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? 'Resume' : 'Pause'}</button><button type="button" disabled={!printable(text).trim()} onClick={() => { setPaused(false); setReplay((value) => value + 1); }}><RotateCcw size={15} />Write again</button></div>
    </div><div className="pen-preview"><div className="pen-preview-bar"><span>THE PEN IS MIGHTIER.</span><span role="status">{!printable(text).trim() ? 'READY FOR YOUR NOTE' : done ? 'NOTE COMPLETE' : paused ? 'PEN PAUSED' : 'WRITING…'}</span></div><PenWriter text={text} ink={inks[ink]} speed={speed} paused={paused} replay={replay} onComplete={setDone} /><div className="pen-preview-caption"><span>Drawn stroke by stroke. Nothing sent or saved.</span><a href="/licenses/EMS-Allure-OFL.txt" target="_blank" rel="noreferrer">Font credits</a></div></div></div>
  </section>;
}
