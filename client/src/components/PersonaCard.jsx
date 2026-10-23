import { Check, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PersonaCard({ persona, selected, onSelect, compact = false }) {
  const Icon = persona.icon;
  const content = <><span className={`persona-icon ${persona.color}`}><Icon size={compact ? 19 : 23} strokeWidth={1.7} /></span><div><h3>{persona.name}</h3><p>{persona.description}</p></div>{compact ? <span className={`radio-dot ${selected ? 'checked' : ''}`}>{selected && <Check size={10} />}</span> : <ArrowUpRight className="persona-arrow" size={17} />}</>;
  return compact
    ? <button type="button" className={`persona-card compact ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(persona.id)}>{content}</button>
    : <Link className="persona-card" to={`/studio?persona=${persona.id}`}>{content}</Link>;
}
