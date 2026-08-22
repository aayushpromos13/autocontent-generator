import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusSquare,
  FolderKanban,
  CalendarDays,
  Bot,
  Layers3,
  Settings,
  Sparkles,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Create video', path: '/create', icon: PlusSquare },
  { label: 'Projects', path: '/projects', icon: FolderKanban },
  { label: 'Content calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Automation', path: '/automation', icon: Bot },
  { label: 'Templates', path: '/templates', icon: Layers3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPage = navigation.find((item) => location.pathname === item.path)?.label ?? 'Settings';
  const initials = (profile?.display_name || user?.email || 'A').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-ink-50">
      {mobileOpen && (
        <button className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-ink-100 px-6">
          <NavLink to="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles size={19} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-ink-900">AutoContent <span className="text-brand-600">AI</span></span>
          </NavLink>
          <button onClick={() => setMobileOpen(false)} className="btn-ghost p-1.5 lg:hidden"><X size={20} /></button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Workspace</p>
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}
            >
              <span className="flex items-center gap-3"><Icon size={18} strokeWidth={1.8} />{label}</span>
              {location.pathname === path && <ChevronRight size={15} className="text-brand-500" />}
            </NavLink>
          ))}
          <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Account</p>
          <NavLink to="/settings" onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}>
            <Settings size={18} strokeWidth={1.8} /> Settings
          </NavLink>
        </nav>

        <div className="border-t border-ink-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-800">{profile?.display_name || 'Creator'}</p><p className="truncate text-xs text-ink-400">{user?.email}</p></div>
            <button onClick={signOut} className="text-ink-400 transition-colors hover:text-red-600" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b border-ink-200 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="btn-ghost p-2 lg:hidden"><Menu size={21} /></button><div><p className="text-xs text-ink-400">Workspace</p><h1 className="text-lg font-semibold text-ink-900">{currentPage}</h1></div></div>
          <div className="flex items-center gap-2"><button className="btn-ghost p-2 text-ink-500" title="Help"><HelpCircle size={19} /></button><button className="btn-ghost relative p-2 text-ink-500" title="Notifications"><Bell size={19} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" /></button><NavLink to="/create" className="btn-primary ml-2 hidden sm:inline-flex"><PlusSquare size={17} /> Create video</NavLink></div>
        </header>
        <main className="flex-1 overflow-y-auto"><div className="mx-auto max-w-[1440px] p-4 sm:p-8">{children}</div></main>
      </div>
    </div>
  );
}
