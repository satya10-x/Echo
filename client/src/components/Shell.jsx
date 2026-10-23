import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, LayoutGrid, PenLine, Plus, Sparkles } from 'lucide-react';
import AppHeader, { Brand } from './AppHeader';
import useDraftWorkspace from '../hooks/useDraftWorkspace';

export default function Shell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = useDraftWorkspace();
  useEffect(() => { setOpen(false); }, [location.key]);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const startDraft = () => { if (workspace.newDraft()) { setOpen(false); navigate('/studio'); } };
  return <div className={`app-shell ${open ? 'navigation-open' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {open && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside id="workspace-navigation" className={`sidebar ${open ? 'is-open' : ''}`}>
      <Brand className="desktop-brand" />
      <button onClick={startDraft} className="button primary sidebar-new"><Plus size={17} /> New draft</button>
      <p className="nav-label">YOUR SPACE</p>
      <nav aria-label="Main navigation"><NavLink to="/" end><LayoutGrid size={18} /> Workspace <ChevronRight className="nav-chevron" size={15} /></NavLink><NavLink to="/studio"><PenLine size={18} /> Rewrite Studio <ChevronRight className="nav-chevron" size={15} /></NavLink></nav>
      <div className="sidebar-bottom"><div className="small-note"><span className="mini-spark"><Sparkles size={18} /></span><strong>One message.<br />Every audience.<br />Perfectly understood.</strong><p>Start with what you mean. Shape how it lands.</p><Link to="/studio">Open your studio <ArrowUpRight size={14} /></Link></div><div className="foundation-status"><span className="status-dot" /><span>Frontend preview</span><span className="version">v0.2</span></div></div>
    </aside>
    <div className="main-shell"><AppHeader open={open} onToggle={() => setOpen(!open)} onNewDraft={startDraft} /><main id="main-content" key={location.pathname} tabIndex={-1}><Outlet context={{ ...workspace, startDraft }} /></main><footer className="app-footer"><span>One message. Every audience. Perfectly understood.</span><span>Drafts stay in this tab · Not saved <Sparkles size={12} /></span></footer></div>
  </div>;
}
