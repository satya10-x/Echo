const tones = ['Professional', 'Friendly', 'Assertive', 'Empathetic', 'Diplomatic', 'Casual'];
const lengths = ['Concise', 'Balanced', 'Detailed'];
const purposes = ['Inform', 'Request', 'Give feedback', 'Apologize', 'Persuade'];
function SelectControl({ label, options, value, onChange }) {
  return <label className="context-field">{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
export function ToneSelector(props) { return <SelectControl label="Tone" options={tones} {...props} />; }
export function LengthSelector(props) { return <SelectControl label="Output length" options={lengths} {...props} />; }
export function PurposeSelector(props) { return <SelectControl label="Communication purpose" options={purposes} {...props} />; }
export default function DeliveryControls({ settings, onChange }) {
  return <section className="tone-section" aria-labelledby="delivery-heading"><div className="control-heading"><h2 id="delivery-heading"><span>02</span> Shape the delivery</h2><span>Fine-tune the details</span></div><div className="delivery-card"><div className="delivery-primary-fields"><ToneSelector value={settings.tone} onChange={(value) => onChange('tone', value)} /><LengthSelector value={settings.length} onChange={(value) => onChange('length', value)} /></div><details className="context-details"><summary>Add purpose & audience <span>Optional context</span></summary><div className="context-fields"><PurposeSelector value={settings.purpose} onChange={(value) => onChange('purpose', value)} /><label className="context-field">Audience <span className="optional">Optional</span><input value={settings.audience} onChange={(event) => onChange('audience', event.target.value)} maxLength={160} placeholder="e.g. project manager" /></label></div></details></div></section>;
}
