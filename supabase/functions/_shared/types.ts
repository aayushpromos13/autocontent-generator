// Shared AI provider types for edge functions.
// Mirrors src/services/ai/types.ts but kept independent to avoid cross-bundle imports.

export interface ScriptGenerationInput {
  idea: string;
  niche: string;
  tone: string;
  language: string;
  durationSeconds: number;
  visualStyle: string;
}

export interface GeneratedScene {
  scene_number: number;
  duration_seconds: number;
  narration: string;
  visual_description: string;
  visual_prompt: string;
  on_screen_text: string;
}

export interface GeneratedScript {
  title: string;
  hook: string;
  script: string;
  scenes: GeneratedScene[];
  cta: string;
}

export interface ScriptGenerationResult {
  content: string;
  structured: GeneratedScript;
  provider: string;
  model: string;
  wordCount: number;
  estimatedDuration: number;
}

export interface AIProvider {
  readonly name: string;
  generateScript(input: ScriptGenerationInput): Promise<ScriptGenerationResult>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
