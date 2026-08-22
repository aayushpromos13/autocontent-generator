# AutoContent AI

An AI-powered faceless content creation platform that generates video scripts, scene breakdowns, and narration using Google Gemini. Users describe a video idea, configure creative direction (niche, tone, duration, visual style, language), and the platform produces a structured script with per-scene narration, visual prompts, and on-screen text.

## Major Features

- **Project management** — Create, view, and delete video projects with creative direction settings
- **AI script generation** — Generate structured video scripts via Google Gemini through a secure Supabase Edge Function
- **Scene breakdown** — Each script includes numbered scenes with narration, visual descriptions, visual prompts, and on-screen text
- **Content pipeline tracking** — Visual pipeline showing Script → Scenes → Voiceover & Visuals → Final Video stages with real status
- **Provider settings** — Configure and test the AI provider connection from the Settings page
- **Authentication** — Email/password auth via Supabase Auth
- **Automation settings** — Daily/weekly automated content generation configuration (UI ready, generation not yet implemented)
- **Content calendar** — Schedule and visualize published content (UI ready)
- **Templates** — Reusable project templates (UI ready)

## Architecture

```
Frontend (React + TypeScript + Vite + Tailwind CSS)
    │
    ├── src/pages/           — Route-level pages
    ├── src/components/      — Shared UI components
    ├── src/services/
    │   ├── ai/types.ts       — AI provider interface (provider-agnostic)
    │   └── generation.ts     — Edge function client + data fetching
    ├── src/context/          — Auth context (Supabase session)
    ├── src/lib/supabase.ts   — Supabase client singleton
    └── src/types/database.ts — TypeScript types for all database tables
    │
    ▼
Supabase Edge Functions (Deno)
    ├── generate-script/      — Authenticated script generation via Gemini
    ├── test-ai-provider/     — Test/save/load provider settings
    └── _shared/
        ├── types.ts          — Shared AI provider types
        └── gemini.ts         — Gemini provider implementation
    │
    ▼
Supabase (PostgreSQL + Auth + RLS)
    ├── projects              — Video projects
    ├── scripts               — Generated scripts (1:1 with project)
    ├── scenes                — Scene-by-scene breakdown (N:1 with project)
    ├── jobs                  — Pipeline job tracking
    ├── provider_settings     — Per-user AI provider configuration
    ├── generated_assets     — Voiceover/visual/subtitle assets
    ├── automation_settings  — Per-user automation config
    ├── publishing_records    — Publishing tracking
    └── templates             — Reusable project templates
```

### AI Provider Abstraction

The application uses a provider-agnostic AI interface defined in `src/services/ai/types.ts`. The current implementation uses Google Gemini, but the architecture supports adding future providers (Groq, OpenAI, Qwen) by implementing the `AIProvider` interface:

```typescript
interface AIProvider {
  readonly name: string;
  generateScript(input: ScriptGenerationInput): Promise<ScriptGenerationResult>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
```

The frontend never knows which provider is being used — it calls the Edge Function, which handles provider selection and implementation.

## Frontend Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Your Supabase anon/public key

These are safe to include in frontend code — they are public keys protected by Row Level Security.

### Running Locally

```bash
npm run dev
```

The dev server starts automatically in this environment. In a local clone, run `npm run dev` and open the provided localhost URL.

## Supabase Setup

### Database

This project uses a Supabase-managed PostgreSQL database. The schema is defined in SQL migration files under `supabase/migrations/`:

1. `20260820202206_create_autocontent_schema.sql` — Core schema (projects, scripts, scenes, jobs, profiles, automation_settings, publishing_records, templates, generated_assets)
2. `20260821142831_add_ai_provider_schema.sql` — AI provider extensions (scripts.metadata, scenes.on_screen_text, provider_settings table, unique script-per-project constraint)

**Important:** The database may be Bolt-managed. Do not replace, claim, or migrate the Supabase project casually. Apply migrations through the Supabase MCP tools or Supabase dashboard.

### Row Level Security

All tables have RLS enabled with owner-scoped policies using `auth.uid()`. Users can only read, write, update, and delete their own data. Templates are readable by all authenticated users but only modifiable by their owner.

### Edge Functions

Two Edge Functions are deployed:

#### `generate-script`

Accepts `{ projectId }` from an authenticated user. Verifies project ownership, creates a job, calls Gemini, saves the script and scenes, updates project status to `script_ready`. On failure, marks the project as `failed` and the job as `failed` with a diagnostic error message.

#### `test-ai-provider`

Handles three actions:
- `test` — Tests the Gemini API connection and persists the result
- `save` — Tests the connection, then saves the selected model to `provider_settings` (only marks as connected if the test passes)
- `load` — Returns provider settings (never returns the API key)

Both functions require JWT authentication and include CORS headers.

## Gemini Configuration

### API Key

The `GEMINI_API_KEY` must be configured as a Supabase Edge Function secret. It is never stored in `.env`, frontend code, or Git.

To set it via the Supabase dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add `GEMINI_API_KEY` with your Google AI Studio API key value

### Model Selection

The Gemini model is configurable:

- **Default:** `gemini-2.0-flash` (fast, supports structured JSON output)
- **Override:** Set the `GEMINI_MODEL` Edge Function secret to use a different model (e.g., `gemini-2.5-flash`, `gemini-2.5-pro`)
- **Per-user:** Users can select a model in Settings, which is saved to `provider_settings`. The Edge Function currently uses the `GEMINI_MODEL` env var as the active model.

Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey).

## Environment Variables

| Variable | Location | Required | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Yes | Supabase anon/public key |
| `GEMINI_API_KEY` | Edge Function secret | Yes | Google Gemini API key |
| `GEMINI_MODEL` | Edge Function secret | No | Override default model (default: `gemini-2.0-flash`) |

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Deployment

### Frontend

```bash
npm run build
```

Deploy the `dist/` folder to any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

### Edge Functions

Edge Functions are deployed via the Supabase MCP `deploy_edge_function` tool or the Supabase dashboard. The function code lives in `supabase/functions/` and is read from disk during deployment.

### Database Migrations

Apply migrations via the Supabase MCP `apply_migration` tool or the Supabase SQL editor. Never run `DROP` or destructive operations on existing data.

## Testing

Currently, the project does not have automated tests. Manual testing flow:

1. Sign up/sign in
2. Go to Settings → Test the AI provider connection
3. Create a new video project (idea, niche, tone, duration, style, language)
4. On the project detail page, click "Generate script"
5. Verify the script, hook, CTA, and scene breakdown appear
6. Test regeneration and error states

## Current Limitations

- **Voiceover generation** — Not implemented (marked "Coming soon")
- **Visual generation** — Not implemented (marked "Coming soon")
- **Video assembly** — Not implemented (marked "Coming soon")
- **Publishing** — Not implemented (marked "Coming soon")
- **Automation** — UI exists but automated generation is not wired up
- **Per-user model selection** — The model is saved to the database but the Edge Function uses the `GEMINI_MODEL` env var. A future update can pass the user's selected model to the Edge Function.
- **No automated tests** — Manual testing only

## Future Roadmap

1. **Voiceover generation** — Integrate a TTS provider (e.g., ElevenLabs, Google TTS)
2. **Visual generation** — Integrate image/video generation or stock footage search
3. **Video assembly** — Combine voiceover + visuals + subtitles into a final video
4. **Publishing** — Auto-publish to YouTube, TikTok, Instagram
5. **Automation** — Scheduled daily/weekly content generation
6. **Multi-provider support** — Add Groq, OpenAI, Qwen as alternative script generation providers
7. **Automated tests** — Unit and integration test coverage

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **AI:** Google Gemini API (via Edge Functions, provider-agnostic abstraction)
- **Routing:** React Router v7
