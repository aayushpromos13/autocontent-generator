import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Info, Lightbulb, Sparkles, WandSparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DURATIONS, LANGUAGES, NICHES, TONES, VISUAL_STYLES } from '@/types/database';

export function CreateVideoPage() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const [niche, setNiche] = useState('Technology');
  const [duration, setDuration] = useState(60);
  const [style, setStyle] = useState('minimal');
  const [tone, setTone] = useState('Informative');
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const title = idea.trim().split(/[.!?]/)[0].slice(0, 80) || 'Untitled video';
    const { data, error: insertError } = await supabase.from('projects').insert({ title, idea: idea.trim(), niche, duration_seconds: duration, visual_style: style, tone: tone.toLowerCase(), language, status: 'draft' }).select('id').maybeSingle();
    setSaving(false);
    if (insertError || !data) { setError(insertError?.message || 'Could not save this project.'); return; }
    navigate(`/projects/${data.id}`);
  }

  return <div className="mx-auto max-w-4xl animate-slide-up">
    <button onClick={() => navigate('/dashboard')} className="btn-ghost -ml-3 mb-5"><ArrowLeft size={17} /> Back to overview</button>
    <div className="mb-8"><div className="mb-3 flex items-center gap-2 text-sm font-medium text-brand-600"><Sparkles size={16} /> New project</div><h2 className="text-3xl font-bold tracking-tight text-ink-900">Create a video</h2><p className="mt-2 text-ink-500">Describe your idea and set the creative direction. You can generate assets once providers are connected.</p></div>
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="card p-6 sm:p-8"><div className="mb-5 flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Lightbulb size={19} /></div><div><h3 className="font-semibold text-ink-900">Your idea</h3><p className="mt-0.5 text-sm text-ink-400">What should this video be about?</p></div></div><textarea value={idea} onChange={(e) => setIdea(e.target.value)} required minLength={10} rows={5} placeholder="For example: 5 AI tools that will change how small businesses work in 2026…" className="input resize-none leading-6" /><div className="mt-3 flex items-center gap-2 text-xs text-ink-400"><Info size={14} /> Be specific about the audience or angle for a stronger result.</div></section>
      <section className="card p-6 sm:p-8"><div className="mb-6"><h3 className="font-semibold text-ink-900">Creative direction</h3><p className="mt-0.5 text-sm text-ink-400">Choose how your content should feel.</p></div><div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-medium text-ink-700">Niche</label><select value={niche} onChange={(e) => setNiche(e.target.value)} className="input">{NICHES.map((item) => <option key={item}>{item}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium text-ink-700">Tone</label><select value={tone} onChange={(e) => setTone(e.target.value)} className="input">{TONES.map((item) => <option key={item}>{item}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium text-ink-700">Language</label><select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">{LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></div></div><div className="mt-6"><label className="mb-3 block text-sm font-medium text-ink-700">Video duration</label><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{DURATIONS.map((item) => <button type="button" key={item.seconds} onClick={() => setDuration(item.seconds)} className={`rounded-lg border px-2 py-3 text-center transition-all ${duration === item.seconds ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'}`}><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-[10px] text-ink-400">{item.description}</span></button>)}</div></div><div className="mt-6"><label className="mb-3 block text-sm font-medium text-ink-700">Visual style</label><div className="grid gap-2 sm:grid-cols-3">{VISUAL_STYLES.map((item) => <button type="button" key={item.id} onClick={() => setStyle(item.id)} className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${style === item.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-ink-200 hover:border-ink-300'}`}><div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${style === item.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300'}`}>{style === item.id && <Check size={10} strokeWidth={3} />}</div><div><span className="block text-sm font-medium text-ink-800">{item.label}</span><span className="mt-0.5 block text-xs text-ink-400">{item.description}</span></div></button>)}</div></div></section>
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3 pb-6"><button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">Cancel</button><button type="submit" disabled={saving || idea.trim().length < 10} className="btn-primary"><WandSparkles size={17} /> {saving ? 'Saving project…' : 'Save project'}</button></div>
    </form>
  </div>;
}
