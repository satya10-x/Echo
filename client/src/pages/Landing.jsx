import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Layers3, Menu, ScanText, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Brand } from '../components/AppHeader';
import { personas } from '../personas';

const examples = {
  executive: 'Please send your feedback on the proposal by Thursday so we can plan the next step.',
  supportive: 'When you have a moment, could you share your thoughts on the proposal by Thursday? That will help us plan our next step together.',
  legal: 'Please provide feedback on the proposal by Thursday to inform planning for the next step.',
  genz: 'Quick nudge on the proposal — can you send your thoughts by Thursday so we can figure out what’s next?',
};
const faqs = [
  ['What can I rewrite?', 'Start with an email, a project update, feedback, or rough notes. Choose a persona, then adjust tone, length, purpose, and audience in the Studio.'],
  ['Does AI always preserve the meaning?', 'No. AI can introduce mistakes. VibeShift shows separate fidelity checks, commitment changes, and persona findings so you can review the result before sharing. Checks can also be unavailable.'],
  ['Are my drafts automatically saved?', 'No. History stores versions only when you choose to save them. Rewriting sends your message to the backend and configured AI provider. Saved history is tied to an anonymous browser access token.'],
  ['Can I match my own writing style?', 'Yes. Open Writing Style in the workspace, provide a short exemplar, and extract its style profile. You can then apply those patterns to your message.'],
];

export default function Landing() {
  const [persona, setPersona] = useState('executive');
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="landing">
    <a className="skip-link" href="#landing-main">Skip to content</a>
    <header className="lp-header">
      <Brand to="/" className="lp-brand" />
      <button className="lp-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="landing-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav id="landing-nav" className={menuOpen ? 'lp-nav is-open' : 'lp-nav'} aria-label="Landing navigation" onClick={() => setMenuOpen(false)}>
        <a href="#how-it-works">How it works</a><a href="#voices">The voices</a><a href="#questions">Questions</a><Link className="lp-nav-cta" to="/workspace">Open workspace <ArrowUpRight size={16} /></Link>
      </nav>
    </header>
    <main id="landing-main">
      <section className="lp-hero" aria-labelledby="lp-title">
        <div className="lp-hero-copy"><span className="lp-kicker"><Sparkles size={15} /> YOUR INTENTION. BETTER DELIVERY.</span>
          <h1 id="lp-title">SAME MESSAGE.<br /><span>DIFFERENT</span><br />ENERGY<span className="lp-period">.</span></h1>
          <p>The email you’re overthinking. The feedback you can’t quite phrase. Turn your rough draft into words that fit the moment.</p>
          <div className="lp-hero-actions"><Link to="/studio" className="lp-button">Find your words <ArrowUpRight size={21} /></Link><a href="#voices" className="lp-text-link">See the shift <ArrowDown size={16} /></a></div>
          <div className="lp-hero-note"><Check size={15} /> Four personas. One original intention.</div>
        </div>
        <div className="lp-demo" id="voices">
          <div className="lp-demo-bar"><span><span className="lp-dot" /> THE VIBE CHECK</span><span>0{personas.findIndex((item) => item.id === persona) + 1} / 04 VOICES</span></div>
          <div className="lp-demo-content"><div className="lp-demo-label">YOUR ROUGH DRAFT</div><p className="lp-source">“Hey, checking in on the proposal. Can you send your thoughts by Thursday so we can plan the next step?”</p>
            <fieldset className="lp-personas"><legend>CHOOSE A DIFFERENT ENERGY</legend>{personas.map(({ id, short, icon: Icon }) => <button type="button" key={id} onClick={() => setPersona(id)} aria-pressed={persona === id} className={persona === id ? 'selected' : ''}><Icon size={15} />{short}</button>)}</fieldset>
            <div className="lp-demo-result" aria-live="polite" aria-atomic="true"><div className="lp-demo-label"><Sparkles size={13} /> {personas.find((item) => item.id === persona).short.toUpperCase()} VERSION</div><p>{examples[persona]}</p></div>
            <div className="lp-demo-foot"><span>Illustrative example · not a live AI result</span><Link to={`/studio?persona=${persona}`} aria-label="Try this persona in Studio"><ArrowUpRight size={20} /></Link></div>
          </div>
          <span className="lp-demo-sticker">KEEP THE POINT.<br />SHIFT THE VIBE.</span>
        </div>
      </section>
      <div className="lp-manifesto"><span>LESS SECOND-GUESSING.</span><Sparkles /><span>MORE SAYING WHAT YOU MEAN.</span><Sparkles /><span>THAT’S THE SHIFT.</span></div>
      <section className="lp-process lp-section" id="how-it-works" aria-labelledby="lp-process-title">
        <div><span className="lp-section-index">01 / FROM ROUGH TO READY</span><h2 id="lp-process-title">THREE MOVES.<br /><span>YOUR WORDS.</span></h2><p className="lp-section-intro">You bring the thought. VibeShift helps with the delivery. The final call stays yours.</p><Link to="/studio" className="lp-text-link">Let’s write something <ArrowRight size={17} /></Link></div>
        <ol className="lp-steps">{[
          ['01', 'DROP THE DRAFT.', 'An email, bullet points, or the sentence you’ve rewritten six times. Start wherever you are.'],
          ['02', 'PICK YOUR PERSPECTIVE.', 'Executive clarity. Supportive feedback. Careful compliance language. Or something more Gen-Z. Fine-tune the tone in Studio.'],
          ['03', 'CHECK. THEN SEND.', 'Compare the edits and review meaning, deadlines, obligations, and persona findings. Copy the version you choose to keep.'],
        ].map(([number, title, text]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
      </section>
      <section className="lp-tools lp-section" aria-labelledby="lp-tools-title"><div className="lp-tools-heading"><span className="lp-section-index">02 / A LITTLE MORE PERSPECTIVE</span><h2 id="lp-tools-title">GOOD WORDS.<br /><span>A SECOND LOOK.</span></h2><p>There’s more to a rewrite than sounding polished.</p></div><div className="lp-tool-list">{[
        { icon: ShieldCheck, title: 'KEEP AN EYE ON THE MEANING.', text: 'Inspect fidelity findings, commitment changes, and the actual text diff. AI checks help you review; they aren’t a guarantee.', to: '/studio?view=intelligence', label: 'Explore the checks' },
        { icon: Layers3, title: 'DON’T SETTLE FOR TAKE ONE.', text: 'Explore concise, balanced, and diplomatic variants. Or simulate how a different audience might read your message.', to: '/studio?tool=variants', label: 'Explore variants' },
        { icon: ScanText, title: 'MAKE IT SOUND LIKE YOU.', text: 'Extract patterns from a writing exemplar and apply its style profile. Your selected persona still shapes the result.', to: '/studio?tool=style', label: 'Explore writing style' },
      ].map(({ icon: Icon, title, text, to, label }) => <article key={title}><Icon size={25} strokeWidth={1.8} /><div><h3>{title}</h3><p>{text}</p><Link to={to}>{label} <ArrowUpRight size={15} /></Link></div></article>)}</div></section>
      <section className="lp-faq lp-section" id="questions" aria-labelledby="lp-faq-title"><div><span className="lp-section-index">03 / BEFORE YOU HIT REWRITE</span><h2 id="lp-faq-title">FAIR<br /><span>QUESTIONS.</span></h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} /></summary><p>{answer}</p></details>)}</div></section>
      <section className="lp-last-call"><span className="lp-kicker">THE NEXT MESSAGE IS YOURS.</span><h2>GOT A DRAFT?<br /><span>LET’S SHIFT IT.</span></h2><Link to="/studio" className="lp-button">Open Rewrite Studio <ArrowUpRight size={21} /></Link><p>Review it. Make it yours. Then share it.</p></section>
    </main>
    <footer className="lp-footer"><Brand to="/" className="lp-brand" /><p>Same intention. A better way to say it.</p><Link to="/workspace">Your workspace <ArrowUpRight size={15} /></Link></footer>
  </div>;
}
