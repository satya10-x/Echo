import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bookmark, ChevronRight, Layers3, LayoutGrid, MessageSquareText, PenLine, Plus, ScanText, Sparkles } from 'lucide-react';
import AppHeader, { Brand } from './AppHeader';
import useDraftWorkspace from '../hooks/useDraftWorkspace';

const primaryLinks = [
  { to: '/', label: 'Overview', icon: LayoutGrid },
  { to: '/studio', label: 'Rewrite Studio', icon: PenLine },
  { to: '/history', label: 'Rewrite history', icon: Bookmark },
];
const toolLinks = [
  { to: '/studio?tool=variants', tool: 'variants', label: 'Rewrite variants', icon: Layers3 },
  { to: '/studio?tool=misread', tool: 'misread', label: 'Audience simulator', icon: MessageSquareText },
  { to: '/studio?tool=style', tool: 'style', label: 'Writing style', icon: ScanText },
];
export default function Shell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const workspace = useDraftWorkspace();
  useEffect(() => { setOpen(false); }, [location.key]);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const startDraft = () => { if (workspace.newDraft()) { setOpen(false); navigate('/studio', { state: { newDraft: true } }); } };
  function navigationLink({ to, label, icon: Icon, tool }) {
    const active = tool ? location.pathname === '/studio' && params.get('tool') === tool : location.pathname === to && (to !== '/studio' || !params.has('tool'));
    return <Link key={to} to={to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{active && <ChevronRight className="nav-chevron" size={14} />}</Link>;
  }
  return <div className={`app-shell ${open ? 'navigation-open' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {open && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside id="workspace-navigation" className={`sidebar ${open ? 'is-open' : ''}`}>
      <Brand className="desktop-brand" />
      <div className="workspace-identity"><span className="workspace-monogram">V</span><div><strong>Your workspace</strong><span>A little perspective goes a long way</span></div></div>
      <button onClick={startDraft} className="button primary sidebar-new"><Plus size={17} /> New draft</button>
      <p className="nav-label">WORKSPACE</p><nav aria-label="Main navigation">{primaryLinks.map(navigationLink)}</nav>
      <p className="nav-label tools-nav-label">WRITING TOOLS</p><nav aria-label="Writing tools">{toolLinks.map(navigationLink)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={18} /><strong>Same intention.<br />A better way to say it.</strong><p>Make the message yours. Keep the meaning intact.</p><Link to="/studio">Open the Studio <ArrowUpRight size={14} /></Link></div><div className="foundation-status"><span className="status-dot" /><span>Saved only when you choose</span></div></div>
    </aside>
    <div className="main-shell"><AppHeader open={open} onToggle={() => setOpen(!open)} onNewDraft={startDraft} /><main id="main-content" key={location.pathname} tabIndex={-1}><Outlet context={{ ...workspace, startDraft }} /></main><footer className="app-footer"><span>VibeShift AI <span className="footer-divider">/</span> One message. Every audience.</span><span>Built around what you mean <Sparkles size={12} /></span></footer></div>
  </div>;
}
