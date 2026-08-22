import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, displayName);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'signup' && !result.error) {
      setMode('signin');
      setError(null);
      setEmail('');
      setPassword('');
      setDisplayName('');
      return;
    }

    navigate('/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Left panel - branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 via-ink-900 to-ink-950" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-600/10 blur-3xl" />

        <div className="relative flex items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Sparkles size={22} />
          </div>
          <span className="text-lg font-semibold tracking-tight">AutoContent AI</span>
        </div>

        <div className="relative text-white">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Create faceless videos at scale.
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink-300">
            Turn a single idea into a fully scripted, narrated, and assembled video — then automate the whole pipeline.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'AI script & scene generation',
              'Voiceover, visuals, and subtitles',
              'Content calendar & daily automation',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-ink-200">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-ink-400">© 2026 AutoContent AI</p>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Sparkles size={22} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink-900">AutoContent AI</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-ink-900">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            {mode === 'signin'
              ? 'Sign in to manage your content pipeline.'
              : 'Start generating faceless videos in minutes.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Display name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Creator"
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-red-200">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
