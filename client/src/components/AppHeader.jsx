import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, Menu, Plus, Sparkles, X } from 'lucide-react';
export function Brand({ className = '', to = '/workspace' }) {
  return <Link to={to} className={`brand ${className}`} aria-label="VibeShift AI workspace"><span className="brand-icon"><Sparkles size={20} strokeWidth={2} /></span>VibeShift<span className="brand-ai">AI</span></Link>;
}
export default function AppHeader({ open, onToggle, onNewDraft }) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const tools = { variants: 'Rewrite variants', misread: 'Audience simulator', style: 'Writing style' };
  const page = pathname === '/workspace' ? 'Overview' : pathname === '/studio' ? tools[params.get('tool')] || 'Rewrite Studio' : pathname === '/voice' ? 'Text to voice' : pathname === '/history' ? 'Rewrite history' : 'Page not found';
  return <>
    <div className="mobile-bar"><Brand /><div className="mobile-actions"><button className="icon-button" onClick={onNewDraft} aria-label="New draft"><Plus size={20} /></button><button className="icon-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="workspace-navigation" onClick={onToggle}>{open ? <X /> : <Menu />}</button></div></div>
    <header className="topbar"><div className="breadcrumb"><Link to="/workspace">Workspace</Link><ChevronRight size={13} /><span>{page}</span></div><div className="header-actions"><span className="workspace-top-note"><Sparkles size={14} /> A shift in perspective</span><button className="button primary header-new" onClick={onNewDraft}><Plus size={15} /> New draft</button></div></header>
  </>;
}
