import { Route, Routes, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Shell from './components/Shell';
import Workspace from './pages/Workspace';
import Studio from './pages/Studio';
import History from './pages/History';

function NotFound() {
  return <div className="not-found"><span className="empty-symbol"><Sparkles size={30} /></span><div className="eyebrow">404 · A SMALL DETOUR</div><h1>Let’s find the right page.</h1><p>This page doesn’t exist. Your writing space is one click away.</p><Link className="button primary" to="/"><ArrowLeft size={16} /> Back to workspace</Link></div>;
}
export default function App() {
  return <Routes><Route element={<Shell />}><Route index element={<Workspace />} /><Route path="studio" element={<Studio />} /><Route path="history" element={<History />} /><Route path="*" element={<NotFound />} /></Route></Routes>;
}
