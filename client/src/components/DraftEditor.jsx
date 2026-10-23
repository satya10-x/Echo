import { useRef } from 'react';
import { PenLine, Trash2 } from 'lucide-react';
import { countWords } from '../hooks/useDraftWorkspace';

export default function DraftEditor({ value, onChange, onClear, error }) {
  const editor = useRef(null);
  return <section className="editor-panel draft-panel" aria-labelledby="draft-heading">
    <div className="panel-heading"><h2 id="draft-heading"><PenLine size={17} /> Original draft</h2><button type="button" className="text-button" disabled={!value} onClick={() => { if (onClear()) editor.current?.focus(); }}><Trash2 size={14} /> Clear</button></div>
    <label className="sr-only" htmlFor="draft">Original draft</label>
    <textarea ref={editor} id="draft" value={value} onChange={(event) => onChange(event.target.value)} maxLength={10000} aria-invalid={Boolean(error)} aria-describedby={`draft-count${error ? ' draft-error' : ''}`} placeholder={'Start with what you mean.\n\nPaste a rough email, jot down a few bullet points, or share a thought you haven’t quite found the words for.\n\nWe’ll work on the delivery next.'} />
    <div id="draft-count" className="draft-meta"><span>Rough notes welcome.</span><span>{countWords(value)} words <span className="meta-divider">·</span> {value.length.toLocaleString()} / 10,000 characters</span></div>
    {error && <p id="draft-error" className="validation-message" role="alert">{error}</p>}
  </section>;
}
