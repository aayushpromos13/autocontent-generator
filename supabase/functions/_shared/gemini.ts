// Gemini AI provider implementation using the Google GenAI REST API.
// Kept independent of frontend code; only used by edge functions.

import type {
  AIProvider,
  GeneratedScene,
  GeneratedScript,
  ScriptGenerationInput,
  ScriptGenerationResult,
} from "../_shared/types.ts";

const DEFAULT_MODEL = "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getModel(): string {
  return Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
}

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new ProviderError("AI provider key is not configured. Ask the project owner to set GEMINI_API_KEY as an Edge Function secret.");
  return key;
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese",
  hi: "Hindi",
  ar: "Arabic",
};

function buildPrompt(input: ScriptGenerationInput): string {
  const languageName = LANGUAGE_NAMES[input.language] || "English";
  const sceneCount = Math.max(3, Math.min(12, Math.round(input.durationSeconds / 5)));

  return `You are an expert short-form faceless video scriptwriter.

Write an original, engaging script for a ${input.durationSeconds}-second ${input.niche} video in ${languageName}.
Tone: ${input.tone}.
Visual style: ${input.visualStyle}.
Topic: "${input.idea}"

Requirements:
- Start with a strong hook (first 3 seconds).
- Divide the content into ${sceneCount} scenes, each with an appropriate duration that sums to ~${input.durationSeconds} seconds.
- Write natural narration suitable for text-to-speech voiceover.
- For each scene, provide a concise visual description, a visual prompt (for AI image generation or stock search), and on-screen text.
- End with a natural call-to-action (CTA).
- Do NOT include unsupported factual claims or fake statistics.
- Respond in ${languageName} only.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "title": "string",
  "hook": "string",
  "script": "string (the full narration script)",
  "scenes": [
    {
      "scene_number": 1,
      "duration_seconds": 5,
      "narration": "string",
      "visual_description": "string",
      "visual_prompt": "string",
      "on_screen_text": "string"
    }
  ],
  "cta": "string"
}`;
}

interface GeminiErrorResponse {
  error?: { message?: string; status?: string; code?: number };
}

interface GeminiSuccessResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

type GeminiResponse = GeminiSuccessResponse & GeminiErrorResponse;

function extractJson(text: string): unknown {
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new ProviderError("The AI returned a response that could not be parsed as JSON. Please try again.");
  }
}

function validateScript(data: unknown): GeneratedScript {
  if (typeof data !== "object" || data === null) {
    throw new ProviderError("The AI returned an invalid script structure.");
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== "string" || typeof obj.script !== "string" || typeof obj.hook !== "string") {
    throw new ProviderError("The AI response is missing required fields (title, hook, or script).");
  }
  if (!Array.isArray(obj.scenes)) {
    throw new ProviderError("The AI response is missing the scenes array.");
  }

  const scenes: GeneratedScene[] = obj.scenes.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) {
      throw new ProviderError(`Scene ${i + 1} is invalid.`);
    }
    const s = raw as Record<string, unknown>;
    return {
      scene_number: typeof s.scene_number === "number" ? s.scene_number : i + 1,
      duration_seconds: typeof s.duration_seconds === "number" ? s.duration_seconds : 5,
      narration: typeof s.narration === "string" ? s.narration : "",
      visual_description: typeof s.visual_description === "string" ? s.visual_description : "",
      visual_prompt: typeof s.visual_prompt === "string" ? s.visual_prompt : "",
      on_screen_text: typeof s.on_screen_text === "string" ? s.on_screen_text : "",
    };
  });

  return {
    title: obj.title,
    hook: obj.hook,
    script: obj.script,
    scenes,
    cta: typeof obj.cta === "string" ? obj.cta : "",
  };
}

// Convert Gemini API error responses into safe, diagnostic user-facing messages.
// Never includes the API key or raw request URLs.
function classifyHttpError(status: number, body: GeminiErrorResponse): string {
  const providerMsg = body.error?.message;
  const model = getModel();

  if (status === 400) {
    if (providerMsg?.toLowerCase().includes("model")) {
      return `The Gemini model "${model}" is not available or not supported. Set GEMINI_MODEL to a valid model name (e.g. gemini-2.0-flash).`;
    }
    return providerMsg
      ? `The AI provider rejected the request: ${providerMsg}`
      : "The AI provider rejected the request. The input may be invalid.";
  }
  if (status === 401 || status === 403) {
    return "The Gemini API key is invalid or expired. Ask the project owner to update the GEMINI_API_KEY Edge Function secret.";
  }
  if (status === 404) {
    return `The Gemini model "${model}" was not found. Set GEMINI_MODEL to a valid model name (e.g. gemini-2.0-flash).`;
  }
  if (status === 429) {
    return "The Gemini API rate limit or quota was reached. Please wait a moment and try again.";
  }
  if (status >= 500) {
    return `The Gemini API is experiencing issues (status ${status}). Please try again shortly.`;
  }
  return `The Gemini API returned an unexpected error (status ${status}). Please try again.`;
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  private async callModel(prompt: string): Promise<string> {
    const apiKey = getApiKey();
    const model = getModel();
    const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ProviderError("Could not reach the Gemini API. The network may be unavailable.");
    }

    if (!response.ok) {
      let errorBody: GeminiErrorResponse = {};
      try {
        errorBody = (await response.json()) as GeminiErrorResponse;
      } catch {
        // Response body is not JSON; use status-only message
      }
      // Log diagnostic info server-side (never logs the key or URL with key)
      console.error(`Gemini API error: status=${response.status} model=${model} message=${errorBody.error?.message ?? "N/A"} status_code=${errorBody.error?.status ?? "N/A"}`);
      throw new ProviderError(classifyHttpError(response.status, errorBody));
    }

    const json = (await response.json()) as GeminiResponse;

    // Check for error in the response body even with 200 status
    if (json.error?.message) {
      console.error(`Gemini API body error: model=${model} message=${json.error.message} status=${json.error.status ?? "N/A"}`);
      throw new ProviderError(`The Gemini API returned an error: ${json.error.message}`);
    }

    // Check for content blocking
    if (json.promptFeedback?.blockReason) {
      throw new ProviderError(`The request was blocked by the AI provider: ${json.promptFeedback.blockReason}. Try rephrasing your idea.`);
    }

    const candidate = json.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      // Could be blocked, empty, or finishReason issue
      const reason = candidate?.finishReason;
      if (reason && reason !== "STOP") {
        throw new ProviderError(`The AI stopped generating (reason: ${reason}). Please try again.`);
      }
      throw new ProviderError("The AI returned an empty response. Please try again.");
    }
    return text;
  }

  async generateScript(input: ScriptGenerationInput): Promise<ScriptGenerationResult> {
    const prompt = buildPrompt(input);
    const rawText = await this.callModel(prompt);
    const parsed = extractJson(rawText);
    const structured = validateScript(parsed);

    const wordCount = structured.script.split(/\s+/).filter(Boolean).length;
    const estimatedDuration = structured.scenes.reduce((sum, s) => sum + s.duration_seconds, 0);

    return {
      content: structured.script,
      structured,
      provider: this.name,
      model: getModel(),
      wordCount,
      estimatedDuration,
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const apiKey = getApiKey();
    const model = getModel();
    const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with the word OK." }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      if (response.ok) return { success: true };

      let errorBody: GeminiErrorResponse = {};
      try {
        errorBody = (await response.json()) as GeminiErrorResponse;
      } catch {
        // non-JSON body
      }
      console.error(`Gemini test error: status=${response.status} model=${model} message=${errorBody.error?.message ?? "N/A"}`);
      return { success: false, error: classifyHttpError(response.status, errorBody) };
    } catch {
      return { success: false, error: "Could not reach the Gemini API. The network may be unavailable." };
    }
  }
}
