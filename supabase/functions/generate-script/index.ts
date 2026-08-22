import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { GeminiProvider, ProviderError } from "../_shared/gemini.ts";
import type { ScriptGenerationInput } from "../_shared/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  projectId?: string;
}

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  idea: string;
  niche: string;
  duration_seconds: number;
  visual_style: string;
  tone: string;
  language: string;
  status: string;
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed.", 405);
  }

  // Tracked across the request so the catch block can clean up.
  let supabase: ReturnType<typeof createClient> | null = null;
  let projectId: string | null = null;
  let jobId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Authentication required.", 401);
    }

    supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return errorResponse("Authentication required.", 401);
    }
    const userId = authData.user.id;

    const body = (await req.json()) as RequestBody;
    if (!body.projectId) {
      return errorResponse("Project ID is required.", 400);
    }
    projectId = body.projectId;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return errorResponse("Project not found.", 404);
    }

    const projectRow = project as ProjectRow;
    if (projectRow.user_id !== userId) {
      return errorResponse("Project not found.", 404);
    }

    if (projectRow.status === "script_generating") {
      return errorResponse("Script generation is already in progress.", 409);
    }

    const { error: statusError } = await supabase
      .from("projects")
      .update({ status: "script_generating", error_message: null })
      .eq("id", projectRow.id);

    if (statusError) {
      return errorResponse("Could not update project status.", 500);
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        project_id: projectRow.id,
        user_id: userId,
        job_type: "script",
        status: "running",
        provider: "gemini",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    jobId = (job?.id as string | undefined) ?? null;

    if (jobError) {
      console.error("Failed to create job:", jobError.message);
    }

    const input: ScriptGenerationInput = {
      idea: projectRow.idea,
      niche: projectRow.niche,
      tone: projectRow.tone,
      language: projectRow.language,
      durationSeconds: projectRow.duration_seconds,
      visualStyle: projectRow.visual_style,
    };

    const provider = new GeminiProvider();
    const result = await provider.generateScript(input);

    // Replace any existing script (unique constraint on project_id).
    await supabase.from("scripts").delete().eq("project_id", projectRow.id);

    const { error: scriptInsertError } = await supabase.from("scripts").insert({
      project_id: projectRow.id,
      user_id: userId,
      content: result.content,
      word_count: result.wordCount,
      estimated_duration: result.estimatedDuration,
      provider: result.provider,
      model: result.model,
      metadata: {
        title: result.structured.title,
        hook: result.structured.hook,
        cta: result.structured.cta,
      },
    });

    if (scriptInsertError) {
      throw new Error("Failed to save the generated script to the database.");
    }

    const sceneRows = result.structured.scenes.map((scene) => ({
      project_id: projectRow.id,
      user_id: userId,
      sequence: scene.scene_number,
      description: scene.visual_description,
      narration: scene.narration,
      duration_seconds: scene.duration_seconds,
      visual_prompt: scene.visual_prompt,
      on_screen_text: scene.on_screen_text,
    }));

    if (sceneRows.length > 0) {
      await supabase.from("scenes").delete().eq("project_id", projectRow.id);
      const { error: sceneError } = await supabase.from("scenes").insert(sceneRows);
      if (sceneError) {
        console.error("Failed to save scenes:", sceneError.message);
      }
    }

    if (jobId) {
      await supabase
        .from("jobs")
        .update({ status: "completed", completed_at: new Date().toISOString(), progress: 100 })
        .eq("id", jobId);
    }

    await supabase
      .from("projects")
      .update({ status: "script_ready", error_message: null })
      .eq("id", projectRow.id);

    return new Response(
      JSON.stringify({
        success: true,
        script: result.structured,
        provider: result.provider,
        model: result.model,
        wordCount: result.wordCount,
        estimatedDuration: result.estimatedDuration,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof ProviderError ? err.message : "An unexpected error occurred during generation.";
    console.error("generate-script error:", err instanceof Error ? err.message : String(err));

    // Clean up: mark project as failed and job as failed so they don't stay stuck.
    if (supabase && projectId) {
      try {
        await supabase
          .from("projects")
          .update({ status: "failed", error_message: message })
          .eq("id", projectId);
      } catch (cleanupErr) {
        console.error("Failed to mark project as failed:", cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr));
      }
    }
    if (supabase && jobId) {
      try {
        await supabase
          .from("jobs")
          .update({ status: "failed", error_message: message, completed_at: new Date().toISOString() })
          .eq("id", jobId);
      } catch (cleanupErr) {
        console.error("Failed to mark job as failed:", cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr));
      }
    }

    return errorResponse(message, 500);
  }
});
