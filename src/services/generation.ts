import { supabase } from '@/lib/supabase';
import type { GeneratedScript, Scene, Script, ScriptWithScenes } from '@/types/database';

interface GenerateScriptResponse {
  success: boolean;
  script: GeneratedScript;
  provider: string;
  model: string;
  wordCount: number;
  estimatedDuration: number;
}

interface EdgeFunctionError {
  error: string;
}

export async function generateScript(projectId: string): Promise<GeneratedScript> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('You must be signed in to generate a script.');
  }

  const { data, error } = await supabase.functions.invoke<GenerateScriptResponse | EdgeFunctionError>(
    'generate-script',
    { body: { projectId } }
  );

  if (error) {
    throw new Error(error.message || 'Could not reach the generation service.');
  }

  if (!data || 'error' in data) {
    const msg = (data as EdgeFunctionError)?.error || 'Generation failed.';
    throw new Error(msg);
  }

  return (data as GenerateScriptResponse).script;
}

export async function fetchProjectScript(projectId: string): Promise<ScriptWithScenes | null> {
  const { data: scriptData, error: scriptError } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (scriptError || !scriptData) return null;

  const { data: sceneData, error: sceneError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('sequence', { ascending: true });

  if (sceneError || !sceneData) return null;

  return {
    script: scriptData as Script,
    scenes: sceneData as Scene[],
  };
}

export async function testProviderConnection(): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke<{ success: boolean; error?: string } | EdgeFunctionError>(
    'test-ai-provider',
    { body: { action: 'test' } }
  );

  if (error) {
    return { success: false, error: error.message || 'Could not reach the test service.' };
  }

  if (!data || 'error' in data) {
    return { success: false, error: (data as EdgeFunctionError)?.error || 'Test failed.' };
  }

  return { success: (data as { success: boolean }).success, error: (data as { error?: string }).error };
}

export async function saveProviderSettings(model: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success: boolean } | EdgeFunctionError>(
    'test-ai-provider',
    { body: { action: 'save', model } }
  );

  if (error || !data || 'error' in data) {
    throw new Error((data as EdgeFunctionError)?.error || error?.message || 'Could not save settings.');
  }
}

export interface ProviderSettingsState {
  provider: string;
  model: string;
  connected: boolean;
  lastTestedAt: string | null;
  lastTestStatus: 'success' | 'failed' | null;
  lastTestError: string | null;
}

export async function loadProviderSettings(): Promise<ProviderSettingsState> {
  const { data, error } = await supabase.functions.invoke<ProviderSettingsState | EdgeFunctionError>('test-ai-provider', { body: { action: 'load' } });

  if (error || !data || 'error' in data) {
    return { provider: 'gemini', model: 'gemini-2.0-flash', connected: false, lastTestedAt: null, lastTestStatus: null, lastTestError: null };
  }

  return data as ProviderSettingsState;
}
