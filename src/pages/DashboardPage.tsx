import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Film, FolderOpen, Plus, Sparkles, WandSparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function formatRelativeDate(value: string) {
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function DashboardPage() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(5).then(({ data, error }) => {
      if (!error && data) setProjects(data as Project[]);
      setLoading(false);
    });
  }, [user]);

  const generated = projects.filter((project) => ['ready', 'published', 'scheduled'].includes(project.status)).length;
  const scheduled = projects.filter((project) => project.status === 'scheduled').length;
  const published = projects.filter((project) => project.status === 'published').length;

  return (
    <div className="animate-fade-in space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-ink-900 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand-600/20 to-transparent" />
        <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[32px] border-brand-500/10" />
        <div className="relative max-w-2xl"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-brand-300"><Sparkles size={16} /> Your creative workspace</div><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Good to see you, {profile?.display_name?.split(' ')[0] || 'creator'}.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-ink-300 sm:text-base">Turn your next idea into a video that gets watched. Start with a concept and let your content pipeline do the rest.</p><Link to="/create" className="btn mt-6 bg-white text-ink-900 hover:bg-ink-100"><Plus size={17} /> Create a video</Link></div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Videos generated', value: generated, icon: Film, accent: 'text-brand-600', bg: 'bg-brand-50', note: 'Across your workspace' },
          { label: 'Videos scheduled', value: scheduled, icon: CalendarDays, accent: 'text-amber-600', bg: 'bg-amber-50', note: 'Ready to publish' },
          { label: 'Videos published', value: published, icon: CheckCircle2, accent: 'text-emerald-600', bg: 'bg-emerald-50', note: 'Successfully shipped' },
          { label: 'Automation', value: 'Off', icon: WandSparkles, accent: 'text-ink-600', bg: 'bg-ink-100', note: 'Daily generation' },
        ].map(({ label, value, icon: Icon, accent, bg, note }) => <div key={label} className="card p-5 transition-shadow hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-sm text-ink-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-ink-900">{value}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${accent}`}><Icon size={20} /></div></div><p className="mt-4 text-xs text-ink-400">{note}</p></div>)}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 sm:px-6"><div><h3 className="font-semibold text-ink-900">Recent projects</h3><p className="mt-0.5 text-xs text-ink-400">Your latest content ideas</p></div><Link to="/projects" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">View all <ArrowUpRight size={15} /></Link></div>{loading ? <div className="flex h-48 items-center justify-center"><LoadingSpinner /></div> : projects.length === 0 ? <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-400"><FolderOpen size={22} /></div><p className="font-medium text-ink-700">No projects yet</p><p className="mt-1 max-w-xs text-sm text-ink-400">Create your first video concept to start building your content library.</p><Link to="/create" className="btn-primary mt-5">Create your first video</Link></div> : <div className="divide-y divide-ink-100">{projects.map((project) => <Link to={`/projects/${project.id}`} key={project.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50 sm:px-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Film size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-800">{project.title}</p><p className="mt-1 text-xs text-ink-400">{project.niche} · {formatRelativeDate(project.created_at)}</p></div><StatusBadge status={project.status} /><ArrowUpRight size={16} className="hidden text-ink-300 sm:block" /></Link>)}</div>}</section>
        <section className="card p-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Clock3 size={20} /></div><div><h3 className="font-semibold text-ink-900">Your pipeline</h3><p className="text-xs text-ink-400">Generation stages</p></div></div><div className="mt-6 space-y-4">{['Idea', 'Script & scenes', 'Voiceover & visuals', 'Final video'].map((stage, index) => <div key={stage} className="flex items-center gap-3"><div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index === 0 ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'}`}>{index + 1}</div><span className={`text-sm ${index === 0 ? 'font-medium text-ink-800' : 'text-ink-400'}`}>{stage}</span>{index === 0 && <span className="ml-auto text-xs text-brand-600">Start here</span>}</div>)}</div><Link to="/create" className="btn-secondary mt-7 w-full"><WandSparkles size={16} /> Begin creating</Link></section>
      </div>
    </div>
  );
}
