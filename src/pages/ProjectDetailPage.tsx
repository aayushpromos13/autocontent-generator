import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, FileText, Film, Layers3, Loader2, Play, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Project, Scene, Script } from '@/types/database';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { fetchProjectScript, generateScript } from '@/services/generation';

export function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [{ data: projectData }, scriptResult] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).maybeSingle(),
      fetchProjectScript(id),
    ]);
    setProject(projectData as Project | null);
    if (scriptResult) {
      setScript(scriptResult.script);
      setScenes(scriptResult.scenes);
    } else {
      setScript(null);
      setScenes([]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleGenerate() {
    if (!project || generating) return;
    setError(null);
    setGenerating(true);
    try {
      await generateScript(project.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  async function deleteProject() {
    if (!project) return;
    const { error: deleteError } = await supabase.from('projects').delete().eq('id', project.id);
    if (!deleteError) navigate('/projects');
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><LoadingSpinner /></div>;
  if (!project) return <div className="card p-12 text-center"><p className="font-medium text-ink-700">Project not found</p><Link to="/projects" className="btn-secondary mt-4">Back to projects</Link></div>;

  const isGenerating = project.status === 'script_generating' || generating;
  const scriptReady = project.status === 'script_ready' || !!script;
  const scriptFailed = project.status === 'failed';

  const pipelineSteps = [
    { label: 'Script', icon: FileText, state: isGenerating ? 'generating' : scriptReady ? 'ready' : scriptFailed ? 'failed' : 'pending' },
    { label: 'Scenes', icon: Layers3, state: scenes.length > 0 ? 'ready' : 'pending' },
    { label: 'Voiceover & visuals', icon: Sparkles, state: 'pending' },
    { label: 'Final video', icon: Film, state: 'pending' },
  ];

  const stateStyles: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-white text-ink-400 ring-ink-200', text: 'text-ink-400', label: 'Not started' },
    generating: { bg: 'bg-blue-50 text-blue-600 ring-blue-200', text: 'text-blue-600', label: 'Generating…' },
    ready: { bg: 'bg-emerald-50 text-emerald-600 ring-emerald-200', text: 'text-emerald-600', label: 'Ready' },
    failed: { bg: 'bg-red-50 text-red-600 ring-red-200', text: 'text-red-600', label: 'Failed' },
  };

  return (
    <div className="mx-auto max-w-5xl animate-slide-up space-y-6">
      <button onClick={() => navigate('/projects')} className="btn-ghost -ml-3"><ArrowLeft size={17} /> All projects</button>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-3 flex items-center gap-3"><StatusBadge status={project.status} /><span className="text-sm text-ink-400">{new Date(project.created_at).toLocaleDateString()}</span></div>
          <h2 className="text-3xl font-bold tracking-tight text-ink-900">{project.title}</h2>
          <p className="mt-2 max-w-2xl text-ink-500">{project.idea}</p>
        </div>
        <button onClick={deleteProject} className="btn-secondary text-red-600 hover:bg-red-50">Delete project</button>
      </div>

      <section className="card p-6">
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ['Niche', project.niche],
            ['Duration', `${project.duration_seconds}s`],
            ['Tone', project.tone],
            ['Visual style', project.visual_style],
          ].map(([label, value]) => <div key={label}><p className="text-xs text-ink-400">{label}</p><p className="mt-1 text-sm font-medium capitalize text-ink-800">{value}</p></div>)}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-ink-100 px-6 py-5"><h3 className="font-semibold text-ink-900">Content pipeline</h3><p className="mt-1 text-sm text-ink-400">Track each stage of your video generation.</p></div>
        <div className="grid gap-3 p-6 sm:grid-cols-4">
          {pipelineSteps.map(({ label, icon: Icon, state }, index) => {
            const style = stateStyles[state];
            return <div key={label} className="rounded-xl border border-ink-200 bg-ink-50 p-4"><div className="flex items-center justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${style.bg}`}><Icon size={18} /></div><span className="text-xs text-ink-400">0{index + 1}</span></div><p className="mt-4 text-sm font-medium text-ink-700">{label}</p><p className={`mt-1 text-xs ${style.text}`}>{style.label}</p></div>;
          })}
        </div>
        {project.error_message && (
          <div className="border-t border-ink-100 bg-red-50/60 px-6 py-5">
            <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" /><div><p className="text-sm font-medium text-red-900">Generation failed</p><p className="mt-1 text-sm leading-5 text-red-700/80">{project.error_message}</p></div></div>
          </div>
        )}
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {script && (
        <section className="card overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><FileText size={18} /></div><div><h3 className="font-semibold text-ink-900">Generated script</h3><p className="text-xs text-ink-400">Created with {script.provider} · {script.model}</p></div></div>
            <div className="flex items-center gap-4 text-xs text-ink-400"><span>{script.word_count ?? 0} words</span><span>{script.estimated_duration ?? 0}s est.</span></div>
          </div>
          <div className="space-y-5 p-6">
            {script.metadata?.hook && (
              <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Hook</p><p className="mt-1.5 text-sm leading-6 text-ink-800">{script.metadata.hook}</p></div>
            )}
            <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Script</p><p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink-800">{script.content}</p></div>
            {script.metadata?.cta && (
              <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Call to action</p><p className="mt-1.5 text-sm leading-6 text-ink-800">{script.metadata.cta}</p></div>
            )}
          </div>
        </section>
      )}

      {scenes.length > 0 && (
        <section className="card overflow-hidden animate-fade-in">
          <div className="border-b border-ink-100 px-6 py-5"><h3 className="font-semibold text-ink-900">Scene breakdown</h3><p className="mt-1 text-sm text-ink-400">{scenes.length} scenes · {scenes.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)}s total</p></div>
          <div className="divide-y divide-ink-100">
            {scenes.map((scene, index) => (
              <div key={scene.id} className="p-6">
                <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{index + 1}</span><span className="text-sm font-medium text-ink-800">Scene {scene.sequence}</span><span className="badge bg-ink-100 text-ink-500">{scene.duration_seconds ?? 0}s</span></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Narration</p><p className="mt-1 text-sm leading-5 text-ink-700">{scene.narration || '—'}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Visual description</p><p className="mt-1 text-sm leading-5 text-ink-700">{scene.description || '—'}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Visual prompt</p><p className="mt-1 text-sm leading-5 text-ink-500">{scene.visual_prompt || '—'}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-400">On-screen text</p><p className="mt-1 text-sm leading-5 text-ink-700">{scene.on_screen_text || '—'}</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3 pb-6">
        <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary">
          {isGenerating ? <><Loader2 size={17} className="animate-spin" /> Generating script…</> : script ? <><RefreshCw size={17} /> Regenerate script</> : <><WandSparkles size={17} /> Generate script</>}
        </button>
        <button disabled className="btn-secondary"><Play size={16} /> Preview</button>
      </div>
    </div>
  );
}
