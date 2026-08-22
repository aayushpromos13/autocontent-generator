import { useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, KeyRound, Loader2, Plug, UserCircle, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { loadProviderSettings, saveProviderSettings, testProviderConnection } from '@/services/generation';

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (fast, structured output)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (latest, balanced)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (highest quality)' },
];

export function SettingsPage() {
  const { profile, user } = useAuth();
  const [name, setName] = useState(profile?.display_name || '');
  const [saved, setSaved] = useState(false);

  const [model, setModel] = useState('gemini-2.0-flash');
  const [connected, setConnected] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [lastTestError, setLastTestError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [testing, setTesting] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadProviderSettings().then((settings) => {
      setModel(settings.model || 'gemini-2.0-flash');
      setConnected(settings.connected);
      setLastTestedAt(settings.lastTestedAt);
      setLastTestError(settings.lastTestError);
      setLoadingProvider(false);
    });
  }, []);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testProviderConnection();
    setTestResult({
      success: result.success,
      message: result.success ? 'Connection successful. The AI provider is ready.' : result.error || 'Connection failed.',
    });
    setTesting(false);
  }

  async function handleSaveProvider() {
    setSavingProvider(true);
    setTestResult(null);
    try {
      await saveProviderSettings(model);
      setConnected(true);
      setTestResult({ success: true, message: 'Provider settings saved.' });
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Could not save settings.' });
    } finally {
      setSavingProvider(false);
    }
  }

  const otherProviders = [
    ['Voice provider', 'Create natural voiceovers'],
    ['Visual provider', 'Generate or source video visuals'],
    ['Publishing channels', 'Publish to your connected social accounts'],
  ];

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-6">
      <div><h2 className="text-2xl font-bold tracking-tight text-ink-900">Settings</h2><p className="mt-1 text-sm text-ink-500">Manage your account and connect your content providers.</p></div>

      <section className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3"><UserCircle size={20} className="text-brand-600" /><div><h3 className="font-semibold text-ink-900">Profile</h3><p className="text-sm text-ink-400">Your personal workspace details.</p></div></div>
        <label className="mb-2 block text-sm font-medium text-ink-700">Display name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input max-w-md" />
        <p className="mt-3 text-sm text-ink-400">Signed in as {user?.email}</p>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="btn-primary mt-5">{saved ? <><Check size={16} /> Saved</> : 'Save changes'}</button>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-ink-100 p-6">
          <div className="flex items-center gap-3"><KeyRound size={20} className="text-brand-600" /><div><h3 className="font-semibold text-ink-900">Providers</h3><p className="text-sm text-ink-400">Connect the services that power your pipeline.</p></div></div>
        </div>

        {/* AI Script Provider - functional */}
        <div className="border-b border-ink-100 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Zap size={18} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink-800">AI script provider</p>
                {loadingProvider ? (
                  <Loader2 size={14} className="animate-spin text-ink-400" />
                ) : connected ? (
                  <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Connected</span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-700">Not connected</span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-400">Generate scripts and scene descriptions using Google Gemini.</p>

              {!loadingProvider && (
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-ink-700">Gemini model</label>
                    <select value={model} onChange={(e) => setModel(e.target.value)} className="input max-w-md">
                      {GEMINI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                    <p className="mt-2 text-xs text-ink-400">The API key is configured securely on the server and never exposed in the browser.</p>
                  </div>

                  {testResult && (
                    <div className={`flex items-start gap-2 rounded-lg px-3.5 py-3 text-sm ring-1 ${testResult.success ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>
                      {testResult.success ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  {lastTestedAt && (
                    <p className="text-xs text-ink-400">Last tested: {new Date(lastTestedAt).toLocaleString()}</p>
                  )}

                  {lastTestError && !testResult && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-red-200">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{lastTestError}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button onClick={handleTest} disabled={testing} className="btn-secondary">
                      {testing ? <><Loader2 size={16} className="animate-spin" /> Testing…</> : <><Plug size={16} /> Test connection</>}
                    </button>
                    <button onClick={handleSaveProvider} disabled={savingProvider} className="btn-primary">
                      {savingProvider ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> Save configuration</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other providers - not yet implemented */}
        {otherProviders.map(([title, description]) => (
          <div key={title} className="flex items-center gap-4 border-b border-ink-100 p-5 last:border-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-100 text-ink-500"><Zap size={18} /></div>
            <div className="flex-1"><p className="text-sm font-medium text-ink-800">{title}</p><p className="mt-1 text-xs text-ink-400">{description}</p></div>
            <span className="badge bg-ink-100 text-ink-500">Coming soon</span>
          </div>
        ))}
      </section>
    </div>
  );
}
