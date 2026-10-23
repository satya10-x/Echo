import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Menu, Plus, Sparkles, X } from 'lucide-react';

export function Brand({ className = '' }) {
  return <Link to="/" className={`brand ${className}`} aria-label="VibeShift AI workspace">
    <span className="brand-icon"><Sparkles size={21} /></span>VibeShift<span className="brand-ai">AI</span>
  </Link>;
}
export default function AppHeader({ open, onToggle, onNewDraft }) {
  const { pathname } = useLocation();
  const page = pathname === '/' ? 'Workspace' : pathname === '/studio' ? 'Rewrite Studio' : 'Page not found';
  return <>
    <div className="mobile-bar"><Brand /><div className="mobile-actions"><button className="icon-button" onClick={onNewDraft} aria-label="New draft"><Plus size={20} /></button><button className="icon-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="workspace-navigation" onClick={onToggle}>{open ? <X /> : <Menu />}</button></div></div>
    <header className="topbar"><div className="breadcrumb"><Link to="/">Your space</Link><ChevronRight size={13} /><span>{page}</span></div><div className="header-actions"><span className="preview-pill"><span /> Writing workspace</span><button className="button secondary header-new" onClick={onNewDraft}><Plus size={15} /> New draft</button></div></header>
  </>;
}
