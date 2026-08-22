export type ProjectStatus =
  | 'draft'
  | 'script_generating'
  | 'script_ready'
  | 'scenes_generating'
  | 'scenes_ready'
  | 'voiceover_generating'
  | 'visuals_generating'
  | 'subtitles_generating'
  | 'video_assembling'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'failed';

export type JobType = 'script' | 'scenes' | 'voiceover' | 'visuals' | 'subtitles' | 'video_assembly';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AssetType = 'voiceover' | 'visual' | 'subtitle' | 'music' | 'final_video';
export type AssetStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'x' | 'facebook' | 'other';
export type PublishingStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
export type AutomationFrequency = 'daily' | 'weekdays' | 'weekly' | 'custom';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  default_niche: string | null;
  default_style: string | null;
  default_language: string | null;
  default_duration: number | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  idea: string;
  niche: string;
  duration_seconds: number;
  visual_style: string;
  tone: string;
  language: string;
  status: ProjectStatus;
  error_message: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScriptMetadata {
  title?: string;
  hook?: string;
  cta?: string;
}

export interface Script {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  word_count: number | null;
  estimated_duration: number | null;
  provider: string | null;
  model: string | null;
  metadata: ScriptMetadata;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  user_id: string;
  sequence: number;
  description: string;
  narration: string | null;
  duration_seconds: number | null;
  visual_prompt: string | null;
  on_screen_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedAsset {
  id: string;
  project_id: string;
  scene_id: string | null;
  user_id: string;
  asset_type: AssetType;
  status: AssetStatus;
  provider: string | null;
  storage_path: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  project_id: string;
  user_id: string;
  job_type: JobType;
  status: JobStatus;
  provider: string | null;
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  niche: string | null;
  duration_seconds: number;
  visual_style: string;
  tone: string;
  language: string;
  frequency: AutomationFrequency;
  time_of_day: string;
  days_of_week: number[];
  max_videos_per_run: number;
  auto_publish: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishingRecord {
  id: string;
  project_id: string;
  user_id: string;
  platform: Platform;
  status: PublishingStatus;
  scheduled_for: string | null;
  published_url: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  niche: string;
  duration_seconds: number;
  visual_style: string;
  tone: string;
  language: string;
  idea_template: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const NICHES = [
  'Technology',
  'Finance',
  'Health & Fitness',
  'Education',
  'Entertainment',
  'Business',
  'Science',
  'History',
  'Motivation',
  'Travel',
  'Food & Cooking',
  'Gaming',
] as const;

export const VISUAL_STYLES = [
  { id: 'minimal', label: 'Minimal', description: 'Clean text on solid backgrounds' },
  { id: 'cinematic', label: 'Cinematic', description: 'Dramatic, film-like visuals' },
  { id: 'animated', label: 'Animated', description: 'Motion graphics and illustrations' },
  { id: 'stock-footage', label: 'Stock Footage', description: 'Real-world video clips' },
  { id: 'ai-generated', label: 'AI Generated', description: 'AI-created imagery per scene' },
  { id: 'slideshow', label: 'Slideshow', description: 'Photo-based slideshow format' },
] as const;

export const TONES = [
  'Informative',
  'Casual',
  'Professional',
  'Humorous',
  'Dramatic',
  'Inspirational',
  'Educational',
  'Storytelling',
] as const;

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
] as const;

export const DURATIONS = [
  { seconds: 30, label: '30s', description: 'Short' },
  { seconds: 60, label: '1 min', description: 'Standard' },
  { seconds: 90, label: '1.5 min', description: 'Medium' },
  { seconds: 180, label: '3 min', description: 'Long' },
  { seconds: 300, label: '5 min', description: 'Extended' },
  { seconds: 600, label: '10 min', description: 'In-depth' },
] as const;

export interface ProviderSettings {
  id: string;
  user_id: string;
  provider: string;
  api_key: string | null;
  model: string;
  connected: boolean;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | null;
  last_test_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

export interface ScriptWithScenes {
  script: Script;
  scenes: Scene[];
}
