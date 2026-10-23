const tones = ['Professional', 'Friendly', 'Assertive', 'Empathetic', 'Diplomatic', 'Casual'];
const lengths = ['Concise', 'Balanced', 'Detailed'];
const purposes = ['Inform', 'Request', 'Give feedback', 'Apologize', 'Persuade'];

export function ChoiceSelector({ label, options, value, onChange }) {
  return <fieldset className="choice-field"><legend>{label}</legend><div className="choice-options">{options.map((option) => <button key={option} type="button" aria-pressed={value === option} className={value === option ? 'selected' : ''} onClick={() => onChange(option)}>{option}</button>)}</div></fieldset>;
}
export function ToneSelector(props) { return <ChoiceSelector label="Tone" options={tones} {...props} />; }
export function LengthSelector(props) { return <ChoiceSelector label="Output length" options={lengths} {...props} />; }
export function PurposeSelector({ value, onChange }) {
  return <label className="context-field">Communication purpose<select value={value} onChange={(event) => onChange(event.target.value)}>{purposes.map((purpose) => <option key={purpose}>{purpose}</option>)}</select></label>;
}
export default function DeliveryControls({ settings, onChange }) {
  return <section className="tone-section" aria-labelledby="delivery-heading"><div className="control-heading"><h2 id="delivery-heading"><span>02</span> Shape the delivery</h2><span>Your message, your way</span></div><div className="delivery-card"><ToneSelector value={settings.tone} onChange={(value) => onChange('tone', value)} /><LengthSelector value={settings.length} onChange={(value) => onChange('length', value)} /><details className="context-details"><summary>Add context <span>Purpose & audience</span></summary><div className="context-fields"><PurposeSelector value={settings.purpose} onChange={(value) => onChange('purpose', value)} /><label className="context-field">Audience <span className="optional">Optional</span><input value={settings.audience} onChange={(event) => onChange('audience', event.target.value)} maxLength={160} placeholder="e.g. project manager" /></label></div></details></div></section>;
}
