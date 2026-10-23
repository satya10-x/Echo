import { LoaderCircle, Sparkles } from 'lucide-react';
export function EmptyState({ icon: Icon = Sparkles, title, children }) {
  return <div className="output-empty"><span className="empty-symbol"><Icon size={29} strokeWidth={1.4} /></span><h3>{title}</h3><div className="empty-description">{children}</div></div>;
}
export function LoadingState({ label = 'Shaping your message…' }) {
  return <div className="loading-state" role="status"><LoaderCircle size={26} className="loading-spinner" /><h3>{label}</h3><p>Keeping your original intent in view.</p></div>;
}
