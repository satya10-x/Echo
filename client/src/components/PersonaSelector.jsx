import { personas } from '../personas';
import PersonaCard from './PersonaCard';
export default function PersonaSelector({ value, onChange }) {
  return <section className="persona-picker" aria-labelledby="persona-heading"><div className="control-heading"><h2 id="persona-heading"><span>01</span> Choose a perspective</h2><span>One persona at a time</span></div><div className="studio-personas" role="group" aria-label="Persona">{personas.map((persona) => <PersonaCard key={persona.id} persona={persona} compact selected={value === persona.id} onSelect={onChange} />)}</div></section>;
}
