import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { GeminiProvider, ProviderError } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }
    const userId = authData.user.id;

    const body = (await req.json()) as { action?: string; model?: string };

    if (body.action === "test") {
      const provider = new GeminiProvider();
      let result: { success: boolean; error?: string };
      try {
        result = await provider.testConnection();
      } catch (err) {
        if (err instanceof ProviderError) {
          result = { success: false, error: err.message };
        } else {
          result = { success: false, error: "An unexpected error occurred during testing." };
        }
      }

      // Persist the test result to provider_settings.
      const now = new Date().toISOString();
      const { error: upsertError } = await supabase
        .from("provider_settings")
        .upsert({
          user_id: userId,
          provider: "gemini",
          last_tested_at: now,
          last_test_status: result.success ? "success" : "failed",
          last_test_error: result.success ? null : (result.error ?? null),
          connected: result.success,
        }, { onConflict: "user_id,provider" });

      if (upsertError) {
        console.error("Failed to persist test result:", upsertError.message);
      }

      return jsonResponse({
        success: result.success,
        error: result.error,
        provider: "gemini",
        model: Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash",
      }, result.success ? 200 : 400);
    }

    if (body.action === "save") {
      const model = body.model || "gemini-2.0-flash";

      // Test the connection before saving as "connected".
      const provider = new GeminiProvider();
      let testResult: { success: boolean; error?: string };
      try {
        testResult = await provider.testConnection();
      } catch (err) {
        testResult = {
          success: false,
          error: err instanceof ProviderError ? err.message : "Connection test failed.",
        };
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("provider_settings")
        .upsert({
          user_id: userId,
          provider: "gemini",
          model,
          connected: testResult.success,
          last_tested_at: now,
          last_test_status: testResult.success ? "success" : "failed",
          last_test_error: testResult.success ? null : (testResult.error ?? null),
        }, { onConflict: "user_id,provider" });

      if (error) {
        return jsonResponse({ error: "Could not save provider settings." }, 500);
      }

      if (!testResult.success) {
        return jsonResponse({
          success: false,
          error: testResult.error || "Connection test failed. Settings saved but provider is not connected.",
          provider: "gemini",
          model,
        }, 400);
      }

      return jsonResponse({ success: true, provider: "gemini", model });
    }

    if (body.action === "load") {
      const { data, error } = await supabase
        .from("provider_settings")
        .select("provider, model, connected, last_tested_at, last_test_status, last_test_error")
        .eq("user_id", userId)
        .eq("provider", "gemini")
        .maybeSingle();

      if (error) {
        return jsonResponse({ error: "Could not load provider settings." }, 500);
      }

      return jsonResponse({
        provider: "gemini",
        model: data?.model || "gemini-2.0-flash",
        connected: data?.connected ?? false,
        lastTestedAt: data?.last_tested_at ?? null,
        lastTestStatus: data?.last_test_status ?? null,
        lastTestError: data?.last_test_error ?? null,
      });
    }

    return jsonResponse({ error: "Unknown action." }, 400);
  } catch (err) {
    console.error("test-ai-provider error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "An unexpected error occurred." }, 500);
  }
});
